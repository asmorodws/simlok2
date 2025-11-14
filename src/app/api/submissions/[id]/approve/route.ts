import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { toJakartaISOString } from '@/lib/timezone';
import { z } from 'zod';
import { generateQrString } from '@/lib/qr-security';
import cache, { CacheKeys } from '@/lib/cache';

// Schema for validating final approval data
const finalApprovalSchema = z.object({
  approval_status: z.enum(['APPROVED', 'REJECTED']),
  note_for_vendor: z.string().optional(),
  simlok_number: z.string().optional(),
  simlok_date: z.string().optional(),
});

/**
 * Generate SIMLOK number with database transaction and row locking
 * to prevent race conditions and duplicate numbers.
 * 
 * Uses a different strategy: Lock ALL existing SIMLOK rows to prevent
 * concurrent reads, ensuring sequential number generation.
 */
async function generateSimlokNumberInTransaction(tx: any): Promise<string> {
  // Use Jakarta timezone for year
  const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const now = new Date(jakartaNow);
  const year = now.getFullYear();

  // CRITICAL: Use SELECT MAX with table lock to prevent concurrent reads
  // This ensures only ONE transaction can generate number at a time
  const result = await tx.$queryRaw<Array<{ max_number: bigint | null }>>`
    SELECT CAST(SUBSTRING_INDEX(simlok_number, '/', 1) AS UNSIGNED) as max_number
    FROM Submission 
    WHERE simlok_number IS NOT NULL 
    ORDER BY max_number DESC 
    LIMIT 1 
    FOR UPDATE
  `;

  let nextNumber = 1;
  
  const maxResult = result.length > 0 ? result[0] : null;
  if (maxResult?.max_number !== null && maxResult?.max_number !== undefined) {
    nextNumber = Number(maxResult.max_number) + 1;
    console.log('🔒 Locked max SIMLOK number:', maxResult.max_number, '→ Next:', nextNumber);
  } else {
    console.log('📝 No previous SIMLOK number found, starting from 1');
  }

  const generatedNumber = `${nextNumber}/S00330/${year}-S0`;
  console.log('🎯 Generated SIMLOK number:', generatedNumber);
  
  return generatedNumber;
}

import { RouteParams } from '@/types';

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

    // Check if submission exists
      const existingSubmission = await prisma.submission.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 });
    }

    // Allow approver to finalize approval even if reviewer marked NOT_MEETS_REQUIREMENTS.
    // Only block approval if the submission hasn't been reviewed at all.
    if (existingSubmission.review_status === 'PENDING_REVIEW') {
      return NextResponse.json({ 
        error: 'Submission belum direview' 
      }, { status: 400 });
    }

    if (existingSubmission.approval_status !== 'PENDING_APPROVAL' && 
        existingSubmission.approval_status !== 'NEEDS_REVISION') {
      return NextResponse.json({ 
        error: 'Submission sudah diproses sebelumnya' 
      }, { status: 400 });
    }

    // Get approver user data for auto-fill signer info
    const approverUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        officer_name: true,
        position: true,
        email: true
      }
    });

    if (!approverUser) {
      return NextResponse.json({ 
        error: 'Approver user not found in database' 
      }, { status: 400 });
    }

    let updateData: any = {
      approval_status: validatedData.approval_status,
      note_for_vendor: validatedData.note_for_vendor || '',
      approved_at: new Date(),
      approved_by: session.user.officer_name,
      approved_by_final_id: session.user.id,
      // Auto-fill signer info from approver user
      signer_name: approverUser.officer_name,
      signer_position: approverUser.position || 'Sr Officer Security III',
    };

    // ========== CRITICAL SECTION: USE TRANSACTION ==========
    // This prevents race conditions when generating SIMLOK numbers
    const updatedSubmission = await prisma.$transaction(async (tx) => {
      console.log('🔐 Starting transaction for approval:', id);

      // If approved, generate SIMLOK number and QR code
      if (validatedData.approval_status === 'APPROVED') {
        // Generate SIMLOK number within transaction with row locking
        const simlokNumber = validatedData.simlok_number || await generateSimlokNumberInTransaction(tx);
        const jakartaNow = toJakartaISOString(new Date());
        const simlokDate = validatedData.simlok_date || (jakartaNow ? jakartaNow.split('T')[0] : new Date().toISOString().split('T')[0]);
        
        // Generate QR string for the submission
        const qrString = generateQrString({
          id,
          implementation_start_date: existingSubmission.implementation_start_date || new Date(),
          implementation_end_date: existingSubmission.implementation_end_date || new Date()
        });
        
        updateData = {
          ...updateData,
          simlok_number: simlokNumber,
          simlok_date: new Date(simlokDate!),
          qrcode: qrString,
        };

        console.log('💾 Saving SIMLOK number in transaction:', simlokNumber);
      }

      // Update submission within the same transaction
      const result = await tx.submission.update({
        where: { id },
        data: updateData,
      });

      console.log('✅ Transaction committed successfully');
      return result;
    }, {
      // Transaction options
      maxWait: 5000, // Maximum time to wait for transaction to start (5s)
      timeout: 10000, // Maximum time for transaction to complete (10s)
      isolationLevel: 'Serializable' // Highest isolation level for maximum safety
    });
    // ========== END CRITICAL SECTION ==========

    // Invalidate cache for approver stats
    cache.delete(CacheKeys.APPROVER_STATS);
    console.log('🗑️ Cache invalidated: APPROVER_STATS after approval');

    // Notify vendor of status change (only if user still exists)
    // Fire-and-forget so notifications don't delay the HTTP response.
    if (existingSubmission.user_id) {
      import('@/server/events')
        .then(({ notifyVendorStatusChange }) =>
          notifyVendorStatusChange(
            existingSubmission.user_id!,
            id,
            validatedData.approval_status as 'APPROVED' | 'REJECTED'
          )
        )
        .catch(err => console.error('notifyVendorStatusChange error (async):', err));
    }

    // If approved, also notify reviewer (async)
    if (validatedData.approval_status === 'APPROVED') {
      import('@/server/events')
        .then(({ notifyReviewerSubmissionApproved }) =>
          notifyReviewerSubmissionApproved(id)
        )
        .catch(err => console.error('notifyReviewerSubmissionApproved error (async):', err));
    }

    // Format dates to Asia/Jakarta before returning
    try {
      const { formatSubmissionDates } = await import('@/lib/timezone');
      const formatted = formatSubmissionDates(updatedSubmission);
      return NextResponse.json({
        message: validatedData.approval_status === 'APPROVED' 
          ? 'Submission berhasil disetujui' 
          : 'Submission berhasil ditolak',
        submission: formatted
      });
    } catch (err) {
      console.warn('Failed to format submission dates in approve response:', err);
      return NextResponse.json({
        message: validatedData.approval_status === 'APPROVED' 
          ? 'Submission berhasil disetujui' 
          : 'Submission berhasil ditolak',
        submission: updatedSubmission
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error in approve:', error.issues);
      return NextResponse.json({ 
        error: 'Data tidak valid', 
        details: error.issues 
      }, { status: 400 });
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