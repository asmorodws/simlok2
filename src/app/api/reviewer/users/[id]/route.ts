import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { z } from 'zod';

// Schema for validating user verification data
const userVerificationSchema = z.object({
  status: z.enum(['VERIFY', 'REJECT']),
  note: z.string().optional(),
});

// PATCH /api/reviewer/users/[id] - Verify or reject user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if user exists and is a vendor
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        officer_name: true,
        vendor_name: true,
        role: true,
        verified_at: true,
        verification_status: true,
        created_at: true
      }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (existingUser.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Only vendor users can be verified' }, { status: 400 });
    }

    if (existingUser.verified_at) {
      return NextResponse.json({ error: 'User has already been verified' }, { status: 400 });
    }

    if (existingUser.verification_status === 'REJECTED') {
      return NextResponse.json({ error: 'User has already been rejected' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = userVerificationSchema.parse(body);

    let updatedUser;
    let notificationTitle: string;
    let notificationMessage: string;
    let notificationType: string;

    if (validatedData.status === 'VERIFY') {
      console.log(`Verifying user ${id} by ${session.user.id}`);
      
      // Verify the user
      updatedUser = await prisma.user.update({
        where: { id },
        data: {
          verified_at: new Date(),
          verified_by: session.user.id,
          verification_status: 'VERIFIED'
        },
        include: {
          submissions: {
            select: { id: true }
          }
        }
      });
      
      console.log(`User ${id} verification status updated to:`, updatedUser.verification_status);

      notificationTitle = 'Akun Anda Telah Diverifikasi';
      notificationMessage = 'Selamat! Akun vendor Anda telah diverifikasi dan sekarang dapat mengajukan permohonan Simlok.';
      notificationType = 'user_verified';
    } else {
      // Reject the user - update status instead of deleting
      updatedUser = await prisma.user.update({
        where: { id },
        data: {
          verification_status: 'REJECTED',
          rejected_at: new Date(),
          rejected_by: session.user.officer_name,
          rejection_reason: validatedData.note || 'No reason provided'
        },
        include: {
          submissions: {
            select: { id: true }
          }
        }
      });

      notificationTitle = 'Akun Anda Ditolak';
      notificationMessage = `Maaf, akun vendor Anda tidak dapat diverifikasi. ${validatedData.note || 'Silakan hubungi admin untuk informasi lebih lanjut.'}`;
      notificationType = 'user_rejected';
    }

    // Create notification for the user
    await prisma.notification.create({
      data: {
        scope: 'vendor',
        vendor_id: id,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        data: JSON.stringify({
          userId: id,
          verificationStatus: validatedData.status,
          verifiedBy: session.user.officer_name,
          verifiedAt: validatedData.status === 'VERIFY' ? new Date().toISOString() : null,
          rejectedAt: validatedData.status === 'REJECT' ? new Date().toISOString() : null,
          note: validatedData.note
        })
      }
    });

    // Notify the user via real-time events
    const { notifyUserVerificationResult } = await import('@/server/events');
    await notifyUserVerificationResult(id, validatedData.status, validatedData.note);

    const responseData = { 
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        officer_name: updatedUser.officer_name,
        vendor_name: updatedUser.vendor_name,
        verified_at: updatedUser.verified_at,
        verification_status: updatedUser.verification_status,
        rejected_at: updatedUser.rejected_at,
        rejected_by: updatedUser.rejected_by,
        rejection_reason: updatedUser.rejection_reason,
        verified_by: validatedData.status === 'VERIFY' ? session.user.id : null
      },
      message: `User ${validatedData.status === 'VERIFY' ? 'verified' : 'rejected'} successfully`
    };
    
    console.log('API Response:', JSON.stringify(responseData, null, 2));
    
    return NextResponse.json(responseData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error('Error verifying user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/reviewer/users/[id] - Get user details for verification
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        officer_name: true,
        vendor_name: true,
        address: true,
        phone_number: true,
        profile_photo: true,
        role: true,
        created_at: true,
        verified_at: true,
        verified_by: true,
        submissions: {
          select: {
            id: true,
            job_description: true,
            approval_status: true,
            created_at: true
          },
          orderBy: { created_at: 'desc' },
          take: 5 // Show recent submissions
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}