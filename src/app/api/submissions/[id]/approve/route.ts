import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import cache, { CacheKeys } from '@/lib/cache';
import { SubmissionService } from '@/services/SubmissionService';
import { RouteParams } from '@/types';

// Schema for validating final approval data
const finalApprovalSchema = z.object({
  approval_status: z.enum(['APPROVED', 'REJECTED']),
  note_for_vendor: z.string().optional(),
  simlok_number: z.string().optional(),
  simlok_date: z.string().optional(),
});

// PATCH /api/submissions/[id]/approve - Set final approval status (Approver function)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only APPROVER, ADMIN, or SUPER_ADMIN can access this endpoint
    if (!['APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Approver access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = finalApprovalSchema.parse(body);

    console.log('✅ Approval request:', {
      id,
      approval_status: validatedData.approval_status,
      has_simlok_number: !!validatedData.simlok_number,
    });

    // Use SubmissionService to approve submission
    const updatedSubmission = await SubmissionService.approveSubmission({
      submissionId: id,
      userId: session.user.id,
      userRole: session.user.role,
      action: validatedData.approval_status,
      ...(validatedData.note_for_vendor && { notes: validatedData.note_for_vendor }),
      ...(validatedData.simlok_number && { simlokNumber: validatedData.simlok_number }),
      ...(validatedData.simlok_date && { simlokDate: validatedData.simlok_date }),
    });

    // Invalidate cache for approver stats
    cache.delete(CacheKeys.APPROVER_STATS);
    console.log('🗑️ Cache invalidated: APPROVER_STATS after approval');

    // Notify vendor of status change (async fire-and-forget)
    import('@/server/events')
      .then(({ notifyVendorStatusChange }) =>
        notifyVendorStatusChange(
          updatedSubmission.user_id,
          id,
          validatedData.approval_status as 'APPROVED' | 'REJECTED'
        )
      )
      .catch(err => console.error('notifyVendorStatusChange error (async):', err));

    // If approved, also notify reviewer (async)
    if (validatedData.approval_status === 'APPROVED') {
      import('@/server/events')
        .then(({ notifyReviewerSubmissionApproved }) =>
          notifyReviewerSubmissionApproved(id)
        )
        .catch(err => console.error('notifyReviewerSubmissionApproved error (async):', err));
    }

    return NextResponse.json({
      message: validatedData.approval_status === 'APPROVED' 
        ? 'Submission berhasil disetujui' 
        : 'Submission berhasil ditolak',
      submission: updatedSubmission
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Validation error in approve:', error.issues);
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
        'Only APPROVER can approve': 403,
        'Approver access required': 403,
        'Submission belum direview': 400,
        'Submission sudah diproses': 400,
      };
      
      for (const [msg, status] of Object.entries(statusMap)) {
        if (error.message.includes(msg)) {
          return NextResponse.json({ error: error.message }, { status });
        }
      }
    }
    
    console.error('Error processing final approval:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      submissionId: id
    });
    
    return NextResponse.json({ 
      error: 'Terjadi kesalahan saat memproses persetujuan final',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}