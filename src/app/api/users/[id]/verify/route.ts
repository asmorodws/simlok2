import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/singletons';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/users/[id]/verify - Approve or reject user
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { action, rejection_reason } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !rejection_reason) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        officer_name: true,
        verification_status: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.verification_status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'User is not pending verification' },
        { status: 400 }
      );
    }

    const updateData: any = {
      verification_status: action === 'approve' ? 'VERIFIED' : 'REJECTED',
    };

    if (action === 'approve') {
      updateData.verified_at = new Date();
    } else {
      updateData.rejected_at = new Date();
      updateData.rejection_reason = rejection_reason;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        officer_name: true,
        role: true,
        verification_status: true,
        verified_at: true,
        rejected_at: true,
        rejection_reason: true,
      },
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        vendor_id: user.id,
        scope: 'vendor',
        type: action === 'approve' ? 'SYSTEM' : 'ALERT',
        title: action === 'approve' ? 'Account Verified' : 'Account Rejected',
        message:
          action === 'approve'
            ? 'Your account has been verified. You can now create submissions.'
            : `Your account registration was rejected. Reason: ${rejection_reason}`,
        data: JSON.stringify({
          action,
          verified_by: session.user.id,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: `User ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('User verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify user' },
      { status: 500 }
    );
  }
}
