/**
 * POST /api/v1/notifications/[id]/read
 * Mark a specific notification as read
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/singletons';
import { Cache, CacheNamespaces } from '@/lib/cache';
import { eventsPublisher } from '@/server/eventsPublisher';
import { 
  withErrorHandling, 
  apiSuccess, 
  apiError,
  getAuthenticatedSession,
  handleOptions,
} from '@/lib/api-utils';

async function markAsRead(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = id;

    console.log('🏷️ Mark as read request for notification:', notificationId);

    // Check authentication
    const { session, error: authError } = await getAuthenticatedSession();
    if (authError) {
      console.log('❌ Authentication failed:', authError);
      return authError;
    }

    console.log('👤 User attempting to mark as read:', {
      id: session.user.id,
      role: session.user.role,
      name: session.user.officer_name
    });

    // Get notification
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      console.log('❌ Notification not found:', notificationId);
      return apiError('Notification not found', 404);
    }

    console.log('📋 Found notification:', {
      id: notification.id,
      scope: notification.scope,
      type: notification.type,
      title: notification.title
    });

    // Check permissions
    if (notification.scope === 'admin' && !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      console.log('❌ Admin access denied for role:', session.user.role);
      return apiError('Access denied', 403);
    }

    if (notification.scope === 'vendor') {
      if (session.user.role !== 'VENDOR' || notification.vendor_id !== session.user.id) {
        console.log('❌ Vendor access denied:', { userRole: session.user.role, vendorId: notification.vendor_id, userId: session.user.id });
        return apiError('Access denied', 403);
      }
    }

    if (notification.scope === 'reviewer' && !['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      console.log('❌ Reviewer access denied for role:', session.user.role);
      return apiError('Access denied', 403);
    }

    if (notification.scope === 'approver' && !['APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      console.log('❌ Approver access denied for role:', session.user.role);
      return apiError('Access denied', 403);
    }

    console.log('✅ Permission check passed');

    // Check if already read
    const existingRead = await prisma.notificationRead.findFirst({
      where: {
        notification_id: notificationId,
        ...(notification.scope === 'vendor' 
          ? { vendor_id: session.user.id }
          : { user_id: session.user.id } // For admin, reviewer, approver
        ),
      },
    });

    if (existingRead) {
      console.log('ℹ️ Notification already marked as read');
      return apiSuccess({ message: 'Already marked as read' });
    }

    console.log('📝 Creating read record...');

    // Use upsert to handle duplicate read attempts gracefully
    if (notification.scope === 'vendor') {
      await prisma.notificationRead.upsert({
        where: {
          notification_id_vendor_id: {
            notification_id: notificationId,
            vendor_id: session.user.id
          }
        },
        update: {
          read_at: new Date()
        },
        create: {
          notification_id: notificationId,
          vendor_id: session.user.id
        }
      });
    } else {
      await prisma.notificationRead.upsert({
        where: {
          notification_id_user_id: {
            notification_id: notificationId,
            user_id: session.user.id
          }
        },
        update: {
          read_at: new Date()
        },
        create: {
          notification_id: notificationId,
          user_id: session.user.id
        }
      });
    }

    console.log('✅ Read record created successfully');

    // Invalidate cache - use proper method
    // const vendorId = notification.scope === 'vendor' ? session.user.id : null;
    // const cacheKey = `notifications:${notification.scope}:${vendorId || 'all'}:start:50`;
    
    // Use the correct invalidation method
    await Cache.invalidateByPrefix(`notifications:${notification.scope}`, CacheNamespaces.NOTIFICATIONS);

    console.log('💾 Cache invalidated for notification read:', {
      scope: notification.scope,
      userId: session.user.id,
      notificationId,
      pattern: `notifications:${notification.scope}`
    });

    // Get updated unread count and emit event
    const unreadCount = await prisma.notification.count({
      where: {
        scope: notification.scope,
        ...(notification.scope === 'vendor' ? { vendor_id: session.user.id } : {}),
        reads: {
          none: notification.scope === 'vendor' 
            ? { vendor_id: session.user.id }
            : { user_id: session.user.id }, // For admin, reviewer, approver
        },
      },
    });

    console.log('📊 Updated unread count:', unreadCount);

    // Emit unread count update
    eventsPublisher.notificationUnreadCount({
      scope: notification.scope,
      vendorId: notification.scope === 'vendor' ? session.user.id : undefined,
      unreadCount,
      count: unreadCount,
    });

    return apiSuccess({
      message: 'Notification marked as read',
      unreadCount,
    });

  } catch (error) {
    console.error('💥 Error in markAsRead:', error);
    return apiError('Internal server error', 500);
  }
}

export const POST = withErrorHandling(markAsRead);
export const OPTIONS = handleOptions;
