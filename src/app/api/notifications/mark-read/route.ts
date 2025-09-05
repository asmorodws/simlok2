import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Check if notification exists
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Check if already marked as read
    const existingRead = await prisma.notificationRead.findFirst({
      where: {
        notification_id: notificationId,
        user_id: session.user.id
      }
    });

    if (!existingRead) {
      // Mark as read
      await prisma.notificationRead.create({
        data: {
          notification_id: notificationId,
          user_id: session.user.id,
          vendor_id: session.user.role === 'VENDOR' ? session.user.id : null,
          read_at: new Date()
        }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Mark as read error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
