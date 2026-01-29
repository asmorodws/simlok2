import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { z } from 'zod';
import cache, { CacheKeys } from '@/lib/cache/cache';
import { RouteParams } from '@/types';
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';
import { submissionService } from '@/services/SubmissionService';
import { formatSubmissionDates } from '@/lib/helpers/timezone';

const finalApprovalSchema = z.object({
  approval_status: z.enum(['APPROVED', 'REJECTED']),
  note_for_vendor: z.string().optional(),
  simlok_number: z.string().optional(),
  simlok_date: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, RoleGroups.APPROVERS);
    if (userOrError instanceof NextResponse) return userOrError;

    const body = await request.json();
    const validatedData = finalApprovalSchema.parse(body);

    // Use service for approval logic
    const { updatedSubmission, existingSubmission } = await submissionService.approveOrRejectSubmission(
      id,
      userOrError.id,
      userOrError.officer_name,
      validatedData
    );

    // Invalidate cache
    cache.delete(CacheKeys.APPROVER_STATS);

    // Fire-and-forget notifications
    if (existingSubmission.user_id) {
      import('@/lib/notification/events')
        .then(m => m.notifyVendorStatusChange(existingSubmission.user_id!, id, validatedData.approval_status as any))
        .catch(() => {});
    }
    if (validatedData.approval_status === 'APPROVED') {
      import('@/lib/notification/events')
        .then(m => m.notifyReviewerSubmissionApproved(id))
        .catch(() => {});
    }

    return NextResponse.json({
      message: validatedData.approval_status === 'APPROVED' ? 'Submission berhasil disetujui' : 'Submission berhasil ditolak',
      submission: formatSubmissionDates(updatedSubmission),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Data tidak valid', details: error.issues }, { status: 400 });
    }

    console.error('Error processing final approval:', error);
    
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat memproses persetujuan final' },
      { status: error.message?.includes('tidak ditemukan') ? 404 : 500 }
    );
  }
}
