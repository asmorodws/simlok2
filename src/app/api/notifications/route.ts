import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/singletons';

// GET /api/notifications - Get user notifications
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unread') === 'true';
    const skip = (page - 1) * limit;

    const where: any = {
      scope: session.user.role === 'VENDOR' ? 'vendor' : 'admin',
    };

    if (session.user.role === 'VENDOR') {
      where.vendor_id = session.user.id;
    }

    if (unreadOnly) {
      where.reads = {
        none: {
          OR: [
            { vendor_id: session.user.role === 'VENDOR' ? session.user.id : null },
            { user_id: session.user.role !== 'VENDOR' ? session.user.id : null },
          ],
        },
      };
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          scope: true,
          type: true,
          title: true,
          message: true,
          data: true,
          created_at: true,
          reads: {
            where: {
              OR: [
                { vendor_id: session.user.role === 'VENDOR' ? session.user.id : null },
                { user_id: session.user.role !== 'VENDOR' ? session.user.id : null },
              ],
            },
            select: { read_at: true },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    // Count unread notifications
    const unreadCount = notifications.filter(n => n.reads.length === 0).length;

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
