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
  console.log('🔐 Validating permissions for scope:', query.scope, 'user role:', session.user.role);

  if (query.scope === 'admin' && !['SUPER_ADMIN'].includes(session.user.role)) {
    console.log('❌ Access denied for admin scope. User role:', session.user.role);
    return apiError('Access denied', 403);
  }

  if (query.scope === 'vendor' && !['VENDOR', 'SUPER_ADMIN'].includes(session.user.role)) {
    return apiError('Access denied', 403);
  }

  if (query.scope === 'reviewer' && !['REVIEWER', 'SUPER_ADMIN'].includes(session.user.role)) {
    console.log('❌ Access denied for reviewer scope. User role:', session.user.role);
    return apiError('Access denied', 403);
  }

  if (query.scope === 'approver' && !['APPROVER', 'SUPER_ADMIN'].includes(session.user.role)) {
    console.log('❌ Access denied for approver scope. User role:', session.user.role);
    return apiError('Access denied', 403);
  }

  // For vendor scope, use session user ID if vendorId not provided
  const vendorId = query.scope === 'vendor' 
    ? (query.vendorId || session.user.id)
    : query.vendorId;

  // Build cache key
  const cacheKey = `notifications:${query.scope}:${vendorId || 'all'}:${query.cursor || 'start'}:${query.limit}`;
  console.log('🔑 Cache key:', cacheKey);

  // Try to get from cache first - but skip cache if there are any read status changes
  const cached = await Cache.getJSON<{ notifications: NotificationDto[]; hasMore: boolean; nextCursor: string | null }>(
    cacheKey, 
    { namespace: CacheNamespaces.NOTIFICATIONS, ttl: CacheTTL.SHORT }
  );

  if (cached) {
    console.log('📦 Returning cached result (may not reflect latest read status)');
    return apiSuccess({
      data: cached.notifications,
      pagination: {
        nextCursor: cached.nextCursor,
        hasMore: cached.hasMore,
      }
    });
  } else {
    console.log('🔄 Cache miss, fetching from database');
  }

  // Build where clause
  const whereClause: any = {
    scope: query.scope,
  };

  console.log('🔍 Building where clause for scope:', query.scope);

  if (query.scope === 'vendor' && vendorId) {
    whereClause.vendor_id = vendorId;
    console.log('📋 Adding vendor_id filter:', vendorId);
  }

  // Handle cursor pagination
  if (query.cursor) {
    whereClause.id = {
      lt: query.cursor, // Get notifications before this cursor
    };
  }

  console.log('🎯 Final where clause:', whereClause);

  // Get notifications with read status
  const notifications = await prisma.notification.findMany({
    where: whereClause,
    include: {
      reads: {
        where: query.scope === 'vendor' 
          ? { vendor_id: vendorId }
          : { user_id: session.user.id }, // For admin, reviewer, approver
      },
    },
    orderBy: {
      created_at: 'desc',
    },
    take: query.limit + 1, // Get one extra to check if there are more
  });

  console.log('📊 Found notifications count:', notifications.length);
  console.log('� Read status debug for first 3 notifications:');
  notifications.slice(0, 3).forEach((n, index) => {
    console.log(`  ${index + 1}. ${n.title}`);
    console.log(`     ID: ${n.id}`);
    console.log(`     Reads count: ${n.reads.length}`);
    console.log(`     User ID filter: ${session.user.id}`);
    // if (n.reads.length > 0) {
    //   console.log(`     Read by: ${n.reads[0].user_id || n.reads[0].vendor_id}`);
    // }
  });

  // Filter out notifications that reference non-existent submissions
  const validNotifications = [];
  for (const notification of notifications) {
    let isValid = true;
    
    // Check if notification data contains a submissionId
    if (notification.data) {
      try {
        const data = JSON.parse(notification.data);
        if (data.submissionId) {
          // Verify that the submission still exists
          const submissionExists = await prisma.submission.findUnique({
            where: { id: data.submissionId },
            select: { id: true }
          });
          
          if (!submissionExists) {
            isValid = false;
            // Optionally clean up this orphaned notification
            console.log(`Found orphaned notification ${notification.id} for deleted submission ${data.submissionId}`);
          }
        }
      } catch (error) {
        // If data parsing fails, keep the notification (might not be submission-related)
        console.warn(`Failed to parse notification data for notification ${notification.id}:`, error);
      }
    }
    
    if (isValid) {
      validNotifications.push(notification);
    }
  }

  // Check if there are more notifications
  const hasMore = validNotifications.length > query.limit;
  const notificationsList = hasMore ? validNotifications.slice(0, -1) : validNotifications;
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

  console.log('✅ Formatted notifications count:', formattedNotifications.length);
  console.log('� Read status summary:');
  const readCount = formattedNotifications.filter(n => n.isRead).length;
  const unreadCount = formattedNotifications.filter(n => !n.isRead).length;
  console.log(`   Read: ${readCount}, Unread: ${unreadCount}`);
  console.log('�📤 Returning response with hasMore:', hasMore, 'nextCursor:', nextCursor);

  // Cache the result with shorter TTL to ensure read status freshness
  await Cache.setJSON(
    cacheKey,
    {
      notifications: formattedNotifications,
      hasMore,
      nextCursor,
    },
    { namespace: CacheNamespaces.NOTIFICATIONS, ttl: 30 } // Shorter TTL for read status freshness
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
