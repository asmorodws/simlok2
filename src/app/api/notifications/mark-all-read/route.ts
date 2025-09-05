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

    const userRole = session.user.role;
    
    // Get all notifications based on user role
    let notifications;
    if (userRole === 'ADMIN') {
      notifications = await prisma.notification.findMany({
        where: { scope: 'admin' }
      });
    } else if (userRole === 'VENDOR') {
      notifications = await prisma.notification.findMany({
        where: { 
          OR: [
            { scope: 'vendor', vendor_id: session.user.id },
            { scope: 'vendor', vendor_id: null }
          ]
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 400 }
      );
    }

    // Mark all unread notifications as read
    const notificationIds = notifications.map(n => n.id);
    
    // Get already read notifications
    const alreadyRead = await prisma.notificationRead.findMany({
      where: {
        notification_id: { in: notificationIds },
        user_id: session.user.id
      }
    });

    const alreadyReadIds = alreadyRead.map(r => r.notification_id);
    const unreadIds = notificationIds.filter(id => !alreadyReadIds.includes(id));

    // Create read records for unread notifications
    if (unreadIds.length > 0) {
      await prisma.notificationRead.createMany({
        data: unreadIds.map(notificationId => ({
          notification_id: notificationId,
          user_id: session.user.id,
          vendor_id: session.user.role === 'VENDOR' ? session.user.id : null,
          read_at: new Date()
        }))
      });
    }

    return NextResponse.json({ 
      success: true, 
      marked: unreadIds.length 
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
