import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { notifyReviewerSubmissionResubmitted } from '@/lib/notification/events';
import cache, { CacheKeys } from '@/lib/cache/cache';
import { requireSessionWithRole } from '@/lib/auth/roleHelpers';
import { RouteParams } from '@/types';
import { submissionService } from '@/services/SubmissionService';

/**
 * PATCH /api/submissions/[id]/resubmit
 * 
 * Vendor resubmits a submission after fixing issues noted by reviewer
 * Changes status from NOT_MEETS_REQUIREMENTS back to PENDING_REVIEW
 * Notifies reviewer that submission has been revised and ready for re-review
 */
export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, ['VENDOR']);
    if (userOrError instanceof NextResponse) return userOrError;

    // Use service for resubmit logic
    const { updatedSubmission, vendorName } = await submissionService.resubmitSubmission(
      id,
      userOrError.id,
      userOrError.vendor_name
    );

    // Invalidate caches
    cache.delete(CacheKeys.REVIEWER_STATS);
    cache.delete(CacheKeys.VENDOR_STATS);
    console.log('🗑️ Cache invalidated: REVIEWER_STATS, VENDOR_STATS after resubmission');

    // Notify reviewer that vendor has resubmitted after fixing issues
    await notifyReviewerSubmissionResubmitted(id, vendorName);

    console.log(`✅ Submission ${id} resubmitted successfully, awaiting re-review`);

    return NextResponse.json({
      message: 'Submission berhasil dikirim ulang dan menunggu review',
      submission: updatedSubmission
    });
  } catch (error) {
    console.error('Error resubmitting submission:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('tidak ditemukan') ? 404 : error.message.includes('akses') ? 403 : 500 }
      );
    }
    
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat mengirim ulang submission' 
    }, { status: 500 });
  }
}
