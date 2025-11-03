import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { z } from 'zod';
import { generateQrString } from '@/lib/qr-security';

// Schema for validating final approval data
const finalApprovalSchema = z.object({
  approval_status: z.enum(['APPROVED', 'REJECTED']),
  note_for_vendor: z.string().optional(),
  simlok_number: z.string().optional(),
  simlok_date: z.string().optional(),
});

// Function to generate simlok number
async function generateSimlokNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();

  // Get the last approved submission (semua tahun, tidak direset)
  // Nomor SIMLOK terus bertambah secara berurutan tanpa peduli tahun
  const lastSubmission = await prisma.submission.findFirst({
    where: {
      simlok_number: {
        not: null,
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  let nextNumber = 1;
  
  if (lastSubmission?.simlok_number) {
    // Extract auto-increment number from format: number/S00330/YYYY-S0
    // Ambil substring pertama sebelum karakter '/'
    const firstPart = lastSubmission.simlok_number.split('/')[0];
    const currentNumber = parseInt(firstPart, 10);
    
    // Pastikan parsing berhasil dan hasilnya adalah angka valid
    if (!isNaN(currentNumber) && currentNumber > 0) {
      nextNumber = currentNumber + 1;
    }
    // Jika parsing gagal atau hasil invalid, tetap gunakan 1 sebagai default
  }

  // Format: autoincrement/S00330/tahun-S0
  // Contoh: 1/S00330/2025-S0, 2/S00330/2025-S0, 3/S00330/2026-S0 (tetap lanjut increment)
  // Nomor TIDAK direset per tahun, hanya tahun di format yang berubah
  return `${nextNumber}/S00330/${year}-S0`;
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

    if (existingSubmission.approval_status !== 'PENDING_APPROVAL') {
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
      signer_position: approverUser.position || 'Sr Officer Security III', // Default jika belum ada
    };

    // If approved, generate SIMLOK number and QR code
    if (validatedData.approval_status === 'APPROVED') {
      const simlokNumber = validatedData.simlok_number || await generateSimlokNumber();
      const simlokDate = validatedData.simlok_date || new Date().toISOString().split('T')[0];
      
      // Generate QR string for the submission
      const qrString = generateQrString({
        id,
        implementation_start_date: existingSubmission.implementation_start_date || new Date(),
        implementation_end_date: existingSubmission.implementation_end_date || new Date()
      });
      
      updateData = {
        ...updateData,
        simlok_number: simlokNumber,
        simlok_date: new Date(simlokDate!), // Safe because we set default above
        qrcode: qrString,
      };
    }

    // Update submission. Return only the updated submission fields (avoid fetching full user object)
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: updateData,
    });

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

    return NextResponse.json({
      message: validatedData.approval_status === 'APPROVED' 
        ? 'Submission berhasil disetujui' 
        : 'Submission berhasil ditolak',
      submission: updatedSubmission
    });

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