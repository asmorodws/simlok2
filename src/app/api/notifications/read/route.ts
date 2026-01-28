import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/singletons';

// POST /api/notifications/read - Mark notification(s) as read
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAllAsRead } = body;

    if (markAllAsRead) {
      // Mark all user's notifications as read by creating NotificationRead entries
      const whereClause: any = {
        scope: session.user.role === 'VENDOR' ? 'vendor' : 'admin',
      };
      
      if (session.user.role === 'VENDOR') {
        whereClause.vendor_id = session.user.id;
      }

      const notifications = await prisma.notification.findMany({
        where: whereClause,
        select: { id: true },
      });

      // Create read records for unread notifications
      const result = await prisma.notificationRead.createMany({
        data: notifications.map(n => ({
          notification_id: n.id,
          vendor_id: session.user.role === 'VENDOR' ? session.user.id : null,
          user_id: session.user.role !== 'VENDOR' ? session.user.id : null,
        })),
        skipDuplicates: true,
      });

      return NextResponse.json({
        success: true,
        data: { count: result.count },
        message: `${result.count} notifications marked as read`,
      });
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'notificationIds array is required' },
        { status: 400 }
      );
    }

    // Mark specific notifications as read (only user's own notifications)
    const result = await prisma.notificationRead.createMany({
      data: notificationIds.map((notificationId: string) => ({
        notification_id: notificationId,
        vendor_id: session.user.role === 'VENDOR' ? session.user.id : null,
        user_id: session.user.role !== 'VENDOR' ? session.user.id : null,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      data: { count: result.count },
      message: `${result.count} notifications marked as read`,
    });
  } catch (error) {
    console.error('Mark notifications as read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
