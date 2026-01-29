import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { z } from 'zod';
import { notifyApproverReviewedSubmission, notifyVendorSubmissionRejected } from '@/lib/notification/events';
import cache, { CacheKeys } from '@/lib/cache/cache';
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';
import { RouteParams } from '@/types';
import { submissionService } from '@/services/SubmissionService';

const reviewSchema = z.object({
  review_status: z.enum(['MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS']),
  note_for_approver: z.string().optional(),
  note_for_vendor: z.string().optional(),
  working_hours: z.string().optional().nullable(),
  holiday_working_hours: z.string().optional().nullable(),
  implementation: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  implementation_start_date: z.string().optional().nullable(),
  implementation_end_date: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, RoleGroups.REVIEWERS);
    if (userOrError instanceof NextResponse) return userOrError;

    const body = await request.json();
    const validatedData = reviewSchema.parse(body);

    // Use service for review logic
    const updatedSubmission = await submissionService.reviewSubmission(
      id,
      userOrError.id,
      userOrError.officer_name,
      validatedData
    );

    // Invalidate cache
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
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('tidak ditemukan') ? 404 : 500 }
      );
    }
    
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat mereview submission' 
    }, { status: 500 });
  }
}
