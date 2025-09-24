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
  const { id } = await params;
  const notificationId = id;

  // Check authentication
  const { session, error: authError } = await getAuthenticatedSession();
  if (authError) return authError;

  // Get notification
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    return apiError('Notification not found', 404);
  }

  // Check permissions
  if (notification.scope === 'admin' && !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return apiError('Access denied', 403);
  }

  if (notification.scope === 'vendor') {
    if (session.user.role !== 'VENDOR' || notification.vendor_id !== session.user.id) {
      return apiError('Access denied', 403);
    }
  }

  if (notification.scope === 'reviewer' && !['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return apiError('Access denied', 403);
  }

  if (notification.scope === 'approver' && !['APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return apiError('Access denied', 403);
  }

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
    return apiSuccess({ message: 'Already marked as read' });
  }

  // Mark as read
  await prisma.notificationRead.create({
    data: {
      notification_id: notificationId,
      ...(notification.scope === 'vendor' 
        ? { vendor_id: session.user.id }
        : { user_id: session.user.id } // For admin, reviewer, approver
      ),
    },
  });

  // Invalidate cache
  await Cache.invalidateByPrefix('notifications', CacheNamespaces.NOTIFICATIONS);

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
}

export const POST = withErrorHandling(markAsRead);
export const OPTIONS = handleOptions;
