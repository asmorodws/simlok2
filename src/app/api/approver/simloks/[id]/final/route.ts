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

// Function to generate simlok number - mengikuti sistem admin yang sudah ada
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

// PATCH /api/approver/simloks/[id]/final - Set final approval status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only APPROVER, ADMIN, or SUPER_ADMIN can access this endpoint
    if (!['APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Approver access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    
    // Check if submission exists and has been reviewed
    const existingSubmission = await prisma.submission.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        review_status: true,
        approval_status: true,
        user_id: true,
        implementation_start_date: true,
        implementation_end_date: true,
        user: {
          select: {
            id: true,
            vendor_name: true,
            officer_name: true,
          }
        },
        reviewed_by_user: {
          select: {
            id: true,
            officer_name: true,
          }
        }
      }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Cannot finalize if not reviewed yet
    if (existingSubmission.review_status === 'PENDING_REVIEW') {
      return NextResponse.json({ 
        error: 'Cannot finalize submission that has not been reviewed yet' 
      }, { status: 400 });
    }

    // Cannot finalize if already finalized
    if (existingSubmission.approval_status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ 
        error: 'Submission has already been finalized' 
      }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = finalApprovalSchema.parse(body);

    // Generate simlok number only if approved
    const updateData: any = {
      approval_status: validatedData.approval_status,
      note_for_vendor: validatedData.note_for_vendor || null,
      approved_by_final_id: session.user.id,
      approved_at: new Date(),
    };

    if (validatedData.approval_status === 'APPROVED') {
      // Use provided simlok number or generate one
      updateData.simlok_number = validatedData.simlok_number?.trim() || await generateSimlokNumber();
      
      // Use provided date or current date
      if (validatedData.simlok_date) {
        updateData.simlok_date = new Date(validatedData.simlok_date);
      } else {
        updateData.simlok_date = new Date();
      }
      
      // Auto-generate QR code when approved
      const qrString = generateQrString({
        id: resolvedParams.id,
        implementation_start_date: existingSubmission.implementation_start_date || null,
        implementation_end_date: existingSubmission.implementation_end_date || null
      });
      updateData.qrcode = qrString;
      
      updateData.approval_status = 'APPROVED'; // Update legacy field too
    } else {
      updateData.approval_status = 'REJECTED'; // Update legacy field too
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true,
          }
        },
        reviewed_by_user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
          }
        },
        approved_by_final_user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
          }
        }
      }
    });

    // Log QR code generation for approved submissions
    if (validatedData.approval_status === 'APPROVED' && updateData.qrcode) {
      console.log(`✅ QR Code auto-generated for approved submission ${resolvedParams.id}: ${updateData.qrcode.substring(0, 50)}...`);
    }

    // Import and use the event system for real-time notifications
    const { notifyVendorStatusChange, notifyReviewerSubmissionApproved } = await import('@/server/events');
    
    // Notify vendor with real-time updates
    const vendorStatus = validatedData.approval_status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    await notifyVendorStatusChange(
      existingSubmission.user.id, 
      resolvedParams.id, 
      vendorStatus as 'APPROVED' | 'REJECTED'
    );

    // Notify reviewers when submission is approved
    if (validatedData.approval_status === 'APPROVED') {
      await notifyReviewerSubmissionApproved(resolvedParams.id);
    }

    return NextResponse.json({ 
      submission: updatedSubmission,
      message: `Submission ${validatedData.approval_status.toLowerCase()} successfully`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error('Error finalizing submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
