import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/singletons';
import { z } from 'zod';
import { notifyApproverReviewedSubmission, notifyVendorSubmissionRejected } from '@/server/events';
import cache, { CacheKeys } from '@/lib/cache/cache';
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';

// Schema for validating review data
const reviewSchema = z.object({
  review_status: z.enum(['MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS']),
  note_for_approver: z.string().optional(),
  note_for_vendor: z.string().optional(),
  // Editable fields by reviewer
  working_hours: z.string().optional().nullable(),
  holiday_working_hours: z.string().optional().nullable(),
  implementation: z.string().optional().nullable(),  // correct field name from schema
  content: z.string().optional().nullable(),
  implementation_start_date: z.string().optional().nullable(),
  implementation_end_date: z.string().optional().nullable(),
});

import { RouteParams } from '@/types';

// PATCH /api/submissions/[id]/review - Set review status and note (Reviewer function)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, RoleGroups.REVIEWERS);
    if (userOrError instanceof NextResponse) return userOrError;

    const body = await request.json();
    const validatedData = reviewSchema.parse(body);

    // Check if submission exists
    const existingSubmission = await prisma.submission.findUnique({
      where: { id }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 });
    }

    // Check if submission can be reviewed
    // Reviewer can review if:
    // 1. It's still PENDING_REVIEW (first time review)
    // 2. OR it's been reviewed but approval_status is still PENDING_APPROVAL (can edit review)
    if (existingSubmission.review_status !== 'PENDING_REVIEW' && 
        existingSubmission.approval_status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ 
        error: 'Review tidak dapat diubah karena submission sudah disetujui/ditolak oleh approver' 
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {
      review_status: validatedData.review_status,
      note_for_approver: validatedData.note_for_approver || '',
      note_for_vendor: validatedData.note_for_vendor || '',
      reviewed_at: new Date(),
      reviewed_by: userOrError.officer_name,
    };

    // Update editable fields if provided by reviewer
    if (validatedData.working_hours !== undefined) {
      updateData.working_hours = validatedData.working_hours;
    }
    if (validatedData.holiday_working_hours !== undefined) {
      updateData.holiday_working_hours = validatedData.holiday_working_hours;
    }
    if (validatedData.implementation !== undefined) {
      updateData.implementation = validatedData.implementation;
    }
    if (validatedData.content !== undefined) {
      updateData.content = validatedData.content;
    }
    if (validatedData.implementation_start_date !== undefined) {
      updateData.implementation_start_date = validatedData.implementation_start_date ? new Date(validatedData.implementation_start_date) : null;
    }
    if (validatedData.implementation_end_date !== undefined) {
      updateData.implementation_end_date = validatedData.implementation_end_date ? new Date(validatedData.implementation_end_date) : null;
    }

    console.log('📝 Review update data:', {
      id,
      review_status: updateData.review_status,
      working_hours: updateData.working_hours,
      holiday_working_hours: updateData.holiday_working_hours,
      implementation: updateData.implementation?.substring(0, 50),
      content: updateData.content?.substring(0, 50),
    });

    // Keep approval_status as PENDING_APPROVAL regardless of review_status
    // Approver will decide final approval_status (APPROVED/REJECTED)

    // Update submission with review status
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        simlok_number: true,
        vendor_name: true,
        officer_name: true,
        job_description: true,
        review_status: true,
        approval_status: true,
        note_for_vendor: true,
        user_id: true,
        created_at: true,
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true,
          }
        },
        worker_list: {
          select: {
            id: true,
            worker_name: true,
            worker_photo: true,
          },
          orderBy: { created_at: 'asc' }
        },
        support_documents: {
          select: {
            id: true,
            document_type: true,
            document_subtype: true,
            document_number: true,
            document_date: true,
            uploaded_at: true,
          },
          orderBy: { uploaded_at: 'asc' }
        }
      }
    });

    // Invalidate cache for approver stats (review status affects pending counts)
    cache.delete(CacheKeys.APPROVER_STATS);
    console.log('🗑️ Cache invalidated: APPROVER_STATS after review');

    // Notify approver that reviewer has completed review
    await notifyApproverReviewedSubmission(id);

    // Notify vendor if submission does not meet requirements
    if (validatedData.review_status === 'NOT_MEETS_REQUIREMENTS') {
      await notifyVendorSubmissionRejected(
        {
          id: updatedSubmission.id,
          vendor_name: updatedSubmission.vendor_name,
          officer_name: updatedSubmission.officer_name,
          job_description: updatedSubmission.job_description,
          user_id: updatedSubmission.user_id,
          note_for_vendor: validatedData.note_for_vendor || null,
        },
        userOrError.officer_name || 'Reviewer'
      );
      console.log('📧 Vendor notified: submission needs revision');
    }

    return NextResponse.json({
      message: 'Review berhasil disimpan',
      submission: updatedSubmission
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Data tidak valid', 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error('Error reviewing submission:', error);
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat mereview submission' 
    }, { status: 500 });
  }
}