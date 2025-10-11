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
  const month = String(now.getMonth() + 1).padStart(2, '0'); // MM format

  // Get the last SIMLOK number for current month/year
  const lastSubmission = await prisma.submission.findFirst({
    where: {
      simlok_number: {
        contains: `/${month}/${year}`
      }
    },
    orderBy: {
      simlok_number: 'desc'
    }
  });

  let nextNumber = 1;
  
  if (lastSubmission?.simlok_number) {
    // Extract number from format: number/MM/YYYY
    const match = lastSubmission.simlok_number.match(/^(\d+)\/\d{2}\/\d{4}$/);
    if (match && match[1]) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `${nextNumber}/${month}/${year}`;
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

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

    // Check if submission can be approved (must be reviewed and meets requirements)
    if (existingSubmission.review_status !== 'MEETS_REQUIREMENTS') {
      return NextResponse.json({ 
        error: 'Submission belum direview atau tidak memenuhi syarat' 
      }, { status: 400 });
    }

    if (existingSubmission.approval_status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ 
        error: 'Submission sudah diproses sebelumnya' 
      }, { status: 400 });
    }

    let updateData: any = {
      approval_status: validatedData.approval_status,
      note_for_vendor: validatedData.note_for_vendor || '',
      approved_at: new Date(),
      approved_by_final_id: session.user.id,
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

    // Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        approved_by_final_user: {
          select: {
            officer_name: true
          }
        }
      }
    });

    // Notify vendor of status change
    await import('@/server/events').then(({ notifyVendorStatusChange }) => 
      notifyVendorStatusChange(
        existingSubmission.user_id, 
        id, 
        validatedData.approval_status as 'APPROVED' | 'REJECTED'
      )
    );

    // If approved, also notify reviewer
    if (validatedData.approval_status === 'APPROVED') {
      await import('@/server/events').then(({ notifyReviewerSubmissionApproved }) => 
        notifyReviewerSubmissionApproved(id)
      );
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