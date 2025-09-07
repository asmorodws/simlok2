/**
 * GET /api/v1/notifications
 * Get paginated notifications for admin or vendor
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/singletons';
import { Cache, CacheNamespaces, CacheTTL } from '@/lib/cache';
import { 
  withErrorHandling, 
  apiSuccess, 
  apiError, 
  validateQueryParams,
  getAuthenticatedSession,
  handleOptions,
} from '@/lib/api-utils';
import { NotificationsQuerySchema, NotificationDto } from '@/shared/dto';

async function getNotifications(req: NextRequest) {
  // Validate query parameters
  const { data: query, error: validationError } = validateQueryParams(req, NotificationsQuerySchema);
  if (validationError || !query) {
    return apiError(validationError || 'Invalid query parameters', 400);
  }

  // Check authentication
  const { session, error: authError } = await getAuthenticatedSession();
  if (authError) return authError;

  // Validate permissions
  if (query.scope === 'admin' && session.user.role !== 'ADMIN') {
    return apiError('Access denied', 403);
  }

  if (query.scope === 'vendor' && session.user.role !== 'VENDOR') {
    return apiError('Access denied', 403);
  }

  // For vendor scope, use session user ID if vendorId not provided
  const vendorId = query.scope === 'vendor' 
    ? (query.vendorId || session.user.id)
    : query.vendorId;

  // Build cache key
  const cacheKey = `notifications:${query.scope}:${vendorId || 'all'}:${query.cursor || 'start'}:${query.limit}`;

  // Try to get from cache first
  const cached = await Cache.getJSON<{ notifications: NotificationDto[]; hasMore: boolean; nextCursor: string | null }>(
    cacheKey, 
    { namespace: CacheNamespaces.NOTIFICATIONS, ttl: CacheTTL.SHORT }
  );

  if (cached) {
    return apiSuccess({
      data: cached.notifications,
      pagination: {
        nextCursor: cached.nextCursor,
        hasMore: cached.hasMore,
      }
    });
  }

  // Build where clause
  const whereClause: any = {
    scope: query.scope,
  };

  if (query.scope === 'vendor' && vendorId) {
    whereClause.vendor_id = vendorId;
  }

  // Handle cursor pagination
  if (query.cursor) {
    whereClause.id = {
      lt: query.cursor, // Get notifications before this cursor
    };
  }

  // Get notifications with read status
  const notifications = await prisma.notification.findMany({
    where: whereClause,
    include: {
      reads: {
        where: query.scope === 'admin' 
          ? { user_id: session.user.id }
          : { vendor_id: vendorId },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: query.limit + 1, // Get one extra to check if there are more
  });

  // Check if there are more notifications
  const hasMore = notifications.length > query.limit;
  const notificationsList = hasMore ? notifications.slice(0, -1) : notifications;
  const nextCursor = hasMore ? notificationsList[notificationsList.length - 1]?.id : null;

  // Format response
  const formattedNotifications: NotificationDto[] = notificationsList.map(notification => ({
    id: notification.id,
    scope: notification.scope,
    vendorId: notification.vendor_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    createdAt: notification.created_at.toISOString(),
    isRead: notification.reads.length > 0,
  }));

  // Cache the result
  await Cache.setJSON(
    cacheKey,
    {
      notifications: formattedNotifications,
      hasMore,
      nextCursor,
    },
    { namespace: CacheNamespaces.NOTIFICATIONS, ttl: CacheTTL.SHORT }
  );

  return apiSuccess({
    data: formattedNotifications,
    pagination: {
      nextCursor,
      hasMore,
    }
  });
}

export const GET = withErrorHandling(getNotifications);
export const OPTIONS = handleOptions;
