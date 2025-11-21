import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { notifyReviewerSubmissionResubmitted } from '@/server/events';
import cache, { CacheKeys } from '@/lib/cache';

import { RouteParams } from '@/types';

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
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only VENDOR can resubmit their own submissions
    if (session.user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Hanya vendor yang dapat mengirim ulang pengajuan' }, { status: 403 });
    }

    // Check if submission exists and belongs to this vendor
    const existingSubmission = await prisma.submission.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 });
    }

    // Verify ownership
    if (existingSubmission.user_id !== session.user.id) {
      return NextResponse.json({ 
        error: 'Anda tidak memiliki akses untuk mengirim ulang submission ini' 
      }, { status: 403 });
    }

    // Only allow resubmit if review status is NOT_MEETS_REQUIREMENTS
    if (existingSubmission.review_status !== 'NOT_MEETS_REQUIREMENTS') {
      return NextResponse.json({ 
        error: 'Submission ini tidak dalam status perlu perbaikan',
        currentStatus: existingSubmission.review_status
      }, { status: 400 });
    }

    console.log(`🔄 Vendor resubmitting submission ${id} after revision`);
    console.log(`📋 Previous review note: ${existingSubmission.note_for_vendor?.substring(0, 100)}`);

    // Update submission status to PENDING_REVIEW for re-review by reviewer
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: {
        review_status: 'PENDING_REVIEW',
        approval_status: 'PENDING_APPROVAL',
        // Clear previous review data so reviewer can review fresh
        reviewed_at: null,
        reviewed_by: null,
        note_for_approver: null,
        note_for_vendor: null,
        // Clear vendor note to remove "tidak memenuhi syarat" status indication
      },
      include: {
        user: true,
        worker_list: {
          orderBy: { created_at: 'asc' }
        },
        support_documents: {
          orderBy: { uploaded_at: 'asc' }
        }
      }
    });

    // Invalidate caches
    cache.delete(CacheKeys.REVIEWER_STATS);
    cache.delete(CacheKeys.VENDOR_STATS);
    console.log('🗑️ Cache invalidated: REVIEWER_STATS, VENDOR_STATS after resubmission');

    // Notify reviewer that vendor has resubmitted after fixing issues
    await notifyReviewerSubmissionResubmitted(id, session.user.vendor_name || 'Vendor');

    console.log(`✅ Submission ${id} resubmitted successfully, awaiting re-review`);

    return NextResponse.json({
      message: 'Submission berhasil dikirim ulang dan menunggu review',
      submission: updatedSubmission
    });

  } catch (error) {
    console.error('Error resubmitting submission:', error);
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat mengirim ulang submission' 
    }, { status: 500 });
  }
}
