import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { notifyApproverReviewedSubmission, notifyVendorSubmissionRejected } from '@/server/events';
import cache, { CacheKeys } from '@/lib/cache';
import { SubmissionService } from '@/services/SubmissionService';
import { RouteParams } from '@/types';

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

// PATCH /api/submissions/[id]/review - Set review status and note (Reviewer function)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only REVIEWER, ADMIN, or SUPER_ADMIN can access this endpoint
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Reviewer access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = reviewSchema.parse(body);

    console.log('📝 Review request:', {
      id,
      review_status: validatedData.review_status,
      working_hours: validatedData.working_hours,
      holiday_working_hours: validatedData.holiday_working_hours,
    });

    // Prepare data object for service (filter out undefined values)
    const reviewData: any = {};
    if (validatedData.working_hours !== undefined) reviewData.working_hours = validatedData.working_hours;
    if (validatedData.holiday_working_hours !== undefined) reviewData.holiday_working_hours = validatedData.holiday_working_hours;
    if (validatedData.implementation !== undefined) reviewData.implementation = validatedData.implementation;
    if (validatedData.content !== undefined) reviewData.content = validatedData.content;
    if (validatedData.implementation_start_date !== undefined) reviewData.implementation_start_date = validatedData.implementation_start_date;
    if (validatedData.implementation_end_date !== undefined) reviewData.implementation_end_date = validatedData.implementation_end_date;
    if (validatedData.note_for_approver) reviewData.note_for_approver = validatedData.note_for_approver;
    if (validatedData.note_for_vendor) reviewData.note_for_vendor = validatedData.note_for_vendor;

    // Use SubmissionService to review submission
    const updatedSubmission = await SubmissionService.reviewSubmission({
      submissionId: id,
      userId: session.user.id,
      userRole: session.user.role,
      action: validatedData.review_status,
      ...(validatedData.note_for_approver && { notes: validatedData.note_for_approver }),
      ...(Object.keys(reviewData).length > 0 && { data: reviewData }),
    });

    // Invalidate cache for approver stats
    cache.delete(CacheKeys.APPROVER_STATS);
    console.log('�️ Cache invalidated: APPROVER_STATS after review');

    // Always notify approver that reviewer has saved a review
    await notifyApproverReviewedSubmission(id);

    // If reviewer marked as NOT_MEETS_REQUIREMENTS, notify vendor about rejection
    if (validatedData.review_status === 'NOT_MEETS_REQUIREMENTS') {
      const submissionForNotification = await SubmissionService.getSubmissionById(
        id,
        session.user.id,
        session.user.role as any
      );
      if (submissionForNotification) {
        await notifyVendorSubmissionRejected(
          submissionForNotification as any,
          session.user.officer_name || 'Reviewer'
        );
      }
    }

    return NextResponse.json({
      message: 'Review berhasil disimpan',
      submission: updatedSubmission
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Data tidak valid', 
        details: error.issues 
      }, { status: 400 });
    }
    
    // Handle specific error messages from service
    if (error.message) {
      const statusMap: Record<string, number> = {
        'Submission tidak ditemukan': 404,
        'Submission not found': 404,
        'Only REVIEWER can review': 403,
        'Reviewer access required': 403,
        'Submission tidak dapat direview': 400,
      };
      
      for (const [msg, status] of Object.entries(statusMap)) {
        if (error.message.includes(msg)) {
          return NextResponse.json({ error: error.message }, { status });
        }
      }
    }
    
    console.error('Error reviewing submission:', error);
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat mereview submission' 
    }, { status: 500 });
  }
}