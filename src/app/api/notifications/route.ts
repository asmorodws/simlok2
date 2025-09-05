import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GetNotificationsSchema } from '@/shared/events';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = GetNotificationsSchema.parse({
      scope: searchParams.get('scope'),
      vendorId: searchParams.get('vendorId') || undefined,
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    });

    // Validate access
    if (params.scope === 'admin' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (params.scope === 'vendor' && session.user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build where clause
    let whereClause;
    if (params.scope === 'admin') {
      whereClause = { scope: 'admin' as const };
    } else {
      whereClause = {
        scope: 'vendor' as const,
        vendor_id: params.vendorId!,
      };
    }

    // Get notifications with read status
    const notificationList = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: params.limit || 10,
      ...(params.cursor && {
        skip: 1,
        cursor: { id: params.cursor },
      }),
    });

    // Get read status for each notification
    const readStatusQuery: any = {
      notification_id: { in: notificationList.map(n => n.id) },
    };
    
    if (params.scope === 'admin') {
      readStatusQuery.user_id = session.user.id;
    } else {
      readStatusQuery.vendor_id = params.vendorId;
    }
    
    const readStatusList = await prisma.notificationRead.findMany({
      where: readStatusQuery,
    });

    const readStatusMap = new Map(readStatusList.map(r => [r.notification_id, r]));

    // Map notifications with read status and proper field naming
    const notifications = notificationList.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      scope: notification.scope,
      vendorId: notification.vendor_id,
      createdAt: notification.created_at.toISOString(), // Convert to ISO string
      isRead: readStatusMap.has(notification.id),
      readAt: readStatusMap.get(notification.id)?.read_at?.toISOString() || null,
    }));

    // Count unread notifications
    const unreadQuery: any = {
      ...whereClause,
      NOT: {
        reads: {
          some: params.scope === 'admin' 
            ? { user_id: session.user.id }
            : { vendor_id: params.vendorId }
        },
      },
    };
    
    const totalUnread = await prisma.notification.count({
      where: unreadQuery,
    });

    return NextResponse.json({
      notifications,
      unreadCount: totalUnread,
      nextCursor: notifications.length === (params.limit || 10) 
        ? notifications[notifications.length - 1]?.id 
        : null,
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' }, 
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId, scope, vendorId } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    // Mark as read - use correct unique constraint
    const whereClause = scope === 'admin' 
      ? {
          notification_id_user_id: {
            notification_id: notificationId,
            user_id: session.user.id,
          },
        }
      : {
          notification_id_vendor_id: {
            notification_id: notificationId,
            vendor_id: vendorId!,
          },
        };
        
    await prisma.notificationRead.upsert({
      where: whereClause,
      update: {
        read_at: new Date(),
      },
      create: {
        notification_id: notificationId,
        user_id: scope === 'admin' ? session.user.id : null,
        vendor_id: scope === 'vendor' ? vendorId : null,
        read_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' }, 
      { status: 500 }
    );
  }
}
