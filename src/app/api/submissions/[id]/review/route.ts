import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { z } from 'zod';
import { notifyApproverReviewedSubmission } from '@/server/events';

// Schema for validating review data
const reviewSchema = z.object({
  review_status: z.enum(['MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS']),
  note_for_approver: z.string().optional(),
  note_for_vendor: z.string().optional(),
});

import { RouteParams } from '@/types';

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
      reviewed_by: session.user.officer_name,
    };

    // Previously reviewer could auto-reject the submission. Change behavior:
    // - Do NOT change final `approval_status` when reviewer marks NOT_MEETS_REQUIREMENTS.
    // - Leave `approval_status` as-is (usually PENDING_APPROVAL) so approver can still make final decision.
    // If reviewer changes from NOT_MEETS_REQUIREMENTS -> MEETS_REQUIREMENTS and the submission
    // was previously rejected by reviewer flow, reset approval to pending so approver can re-evaluate.
    if (validatedData.review_status === 'MEETS_REQUIREMENTS') {
      // If changing from NOT_MEETS_REQUIREMENTS to MEETS_REQUIREMENTS, 
      // reset approval status back to PENDING_APPROVAL so approver can review again
      if (existingSubmission.review_status === 'NOT_MEETS_REQUIREMENTS' && 
          existingSubmission.approval_status === 'REJECTED') {
        updateData.approval_status = 'PENDING_APPROVAL';
        updateData.approved_at = null;
        updateData.approved_by = null;
        updateData.approved_by_final_id = null;
      }
    }

    // Update submission with review status
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: updateData,
      include: {
        user: true
      }
    });

    // Always notify approver that reviewer has saved a review (both MEETS and NOT_MEETS)
    // This ensures approver sees the review even when reviewer marks NOT_MEETS_REQUIREMENTS.
    await notifyApproverReviewedSubmission(id);

    // Do NOT notify vendor on reviewer NOT_MEETS_REQUIREMENTS. Vendor will only be notified
    // when approver changes the final approval_status to REJECTED.

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