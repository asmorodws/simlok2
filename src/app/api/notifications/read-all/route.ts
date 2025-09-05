import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emitNotificationUnreadCount } from '@/server/socket';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scope, vendorId } = await request.json();

    // Validate access
    if (scope === 'admin' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (scope === 'vendor' && vendorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all unread notifications for this scope
    const notifications = await prisma.notification.findMany({
      where: {
        scope,
        ...(scope === 'vendor' ? { vendor_id: vendorId } : {}),
        reads: {
          none: scope === 'admin' 
            ? { user_id: session.user.id }
            : { vendor_id: vendorId }
        }
      },
      select: { id: true }
    });

    // Mark all as read
    if (notifications.length > 0) {
      const readRecords = notifications.map((notification: { id: string }) => ({
        notification_id: notification.id,
        ...(scope === 'admin' 
          ? { user_id: session.user.id }
          : { vendor_id: vendorId }
        )
      }));

      await prisma.notificationRead.createMany({
        data: readRecords,
        skipDuplicates: true
      });
    }

    // Emit updated count (should be 0)
    emitNotificationUnreadCount(
      scope, 
      scope === 'vendor' ? vendorId : undefined,
      {
        scope,
        vendorId: scope === 'vendor' ? vendorId : undefined,
        unreadCount: 0,
        count: 0
      }
    );

    return NextResponse.json({ 
      success: true, 
      markedCount: notifications.length,
      unreadCount: 0 
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
