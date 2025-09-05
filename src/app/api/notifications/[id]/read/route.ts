import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emitNotificationUnreadCount } from '@/server/socket';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;

    // Get notification details
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Validate access
    if (notification.scope === 'admin' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (notification.scope === 'vendor' && notification.vendor_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mark as read
    await prisma.notificationRead.upsert({
      where: notification.scope === 'admin' 
        ? { notification_id_user_id: { notification_id: notificationId, user_id: session.user.id } }
        : { notification_id_vendor_id: { notification_id: notificationId, vendor_id: session.user.id } },
      update: { read_at: new Date() },
      create: {
        notification_id: notificationId,
        ...(notification.scope === 'admin' 
          ? { user_id: session.user.id }
          : { vendor_id: session.user.id }
        )
      }
    });

    // Get updated unread count
    const unreadCount = await prisma.notification.count({
      where: {
        scope: notification.scope,
        ...(notification.scope === 'vendor' ? { vendor_id: session.user.id } : {}),
        reads: {
          none: notification.scope === 'admin' 
            ? { user_id: session.user.id }
            : { vendor_id: session.user.id }
        }
      }
    });

    // Emit updated count
    emitNotificationUnreadCount(
      notification.scope, 
      notification.scope === 'vendor' ? session.user.id : undefined,
      {
        scope: notification.scope,
        vendorId: notification.scope === 'vendor' ? session.user.id : undefined,
        unreadCount: unreadCount,
        count: unreadCount
      }
    );

    return NextResponse.json({ success: true, unreadCount });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
