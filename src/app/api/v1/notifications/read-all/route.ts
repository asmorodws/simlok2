/**
 * POST /api/v1/notifications/read-all
 * Mark all notifications as read for current user/scope
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/singletons';
import { Cache, CacheNamespaces } from '@/lib/cache';
import { eventsPublisher } from '@/server/eventsPublisher';
import { 
  withErrorHandling, 
  apiSuccess, 
  apiError,
  validateRequestBody,
  getAuthenticatedSession,
  handleOptions,
} from '@/lib/api-utils';
import { MarkAllAsReadSchema } from '@/shared/dto';

async function markAllAsRead(req: NextRequest) {
  // Validate request body
  const { data: body, error: validationError } = await validateRequestBody(req, MarkAllAsReadSchema);
  if (validationError || !body) {
    return apiError(validationError || 'Invalid request body', 400);
  }

  // Check authentication
  const { session, error: authError } = await getAuthenticatedSession();
  if (authError) return authError;

  // Check permissions
  if (body.scope === 'admin' && !['SUPER_ADMIN'].includes(session.user.role)) {
    return apiError('Access denied', 403);
  }

  if (body.scope === 'vendor' && session.user.role !== 'VENDOR') {
    return apiError('Access denied', 403);
  }

  if (body.scope === 'reviewer' && !['REVIEWER', 'SUPER_ADMIN'].includes(session.user.role)) {
    return apiError('Access denied', 403);
  }

  if (body.scope === 'approver' && !['APPROVER', 'SUPER_ADMIN'].includes(session.user.role)) {
    return apiError('Access denied', 403);
  }

  // For vendor scope, use session user ID if vendorId not provided
  const vendorId = body.scope === 'vendor' 
    ? (body.vendorId || session.user.id)
    : body.vendorId;

  // Get all unread notifications for this scope/user
  const unreadNotifications = await prisma.notification.findMany({
    where: {
      scope: body.scope,
      ...(body.scope === 'vendor' && vendorId ? { vendor_id: vendorId } : {}),
      reads: {
        none: body.scope === 'vendor'
          ? { vendor_id: vendorId }
          : { user_id: session.user.id }, // For admin, reviewer, approver
      },
    },
    select: { id: true },
  });

  if (unreadNotifications.length === 0) {
    return apiSuccess({ message: 'No unread notifications' });
  }

  // Mark all as read in bulk
  const readRecords = unreadNotifications.map(notification => ({
    notification_id: notification.id,
    ...(body.scope === 'vendor' 
      ? { vendor_id: vendorId }
      : { user_id: session.user.id } // For admin, reviewer, approver
    ),
  }));

  await prisma.notificationRead.createMany({
    data: readRecords,
    skipDuplicates: true,
  });

  // Invalidate cache
  await Cache.invalidateByPrefix('notifications', CacheNamespaces.NOTIFICATIONS);

  // Emit unread count update (should be 0 now)
  eventsPublisher.notificationUnreadCount({
    scope: body.scope,
    vendorId: body.scope === 'vendor' ? vendorId : undefined,
    unreadCount: 0,
    count: 0,
  });

  return apiSuccess({
    message: `Marked ${unreadNotifications.length} notifications as read`,
    markedCount: unreadNotifications.length,
  });
}

export const POST = withErrorHandling(markAllAsRead);
export const OPTIONS = handleOptions;
