/**
 * Notification Service
 * Business logic for notification management
 * Handles notification creation, retrieval, and real-time updates
 * 
 * NOTE: Schema uses Notification + NotificationRead pattern
 */

import { prisma } from '@/lib/singletons';
import { logger } from '@/lib/logger';
import { NotificationScope } from '@/types/enums';

// ==================== TYPE DEFINITIONS ====================

export interface CreateNotificationData {
  vendor_id?: string | null;
  type: string;
  title: string;
  message: string;
  scope: NotificationScope;
  data?: string | null;
}

export interface NotificationFilters {
  userId?: string;
  vendorId?: string;
  unreadOnly?: boolean;
  scope?: NotificationScope;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BulkNotificationData {
  vendorIds?: string[];
  type: string;
  title: string;
  message: string;
  scope: NotificationScope;
  data?: string | null;
}

// ==================== NOTIFICATION SERVICE ====================

export class NotificationService {
  /**
   * Get notifications for a user with read status
   */
  static async getNotifications(filters: NotificationFilters) {
    try {
      const {
        userId,
        vendorId,
        unreadOnly = false,
        scope,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc',
      } = filters;

      const skip = (page - 1) * limit;
      const whereClause: any = {};

      // Filter by scope
      if (scope) {
        whereClause.scope = scope;
      }

      // Filter by vendor
      if (vendorId) {
        whereClause.vendor_id = vendorId;
      }

      // Query notifications
      const notifications = await prisma.notification.findMany({
        where: whereClause,
        include: {
          reads: {
            where: userId ? { user_id: userId } : vendorId ? { vendor_id: vendorId } : {},
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      });

      // Filter unread if needed
      let filteredNotifications = notifications;
      if (unreadOnly) {
        filteredNotifications = notifications.filter(n => n.reads.length === 0);
      }

      const total = await prisma.notification.count({ where: whereClause });
      const unreadCount = notifications.filter(n => n.reads.length === 0).length;

      logger.info('NotificationService', 'Notifications retrieved', {
        userId,
        vendorId,
        total,
        unreadCount,
        page,
      });

      return {
        notifications: filteredNotifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        unreadCount,
      };
    } catch (error) {
      logger.error('NotificationService', 'Error fetching notifications', error, filters);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId?: string, vendorId?: string) {
    try {
      const notifications = await prisma.notification.findMany({
        where: vendorId ? { vendor_id: vendorId } : {},
        include: {
          reads: {
            where: userId ? { user_id: userId } : vendorId ? { vendor_id: vendorId } : {}
          }
        }
      });

      const count = notifications.filter(n => n.reads.length === 0).length;

      logger.debug('NotificationService', 'Unread count retrieved', {
        userId,
        vendorId,
        count,
      });

      return count;
    } catch (error) {
      logger.error('NotificationService', 'Error fetching unread count', error, { userId, vendorId });
      throw error;
    }
  }

  /**
   * Create a single notification
   */
  static async createNotification(data: CreateNotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          vendor_id: data.vendor_id || null,
          type: data.type,
          title: data.title,
          message: data.message,
          scope: data.scope,
          data: data.data || null,
        },
      });

      logger.info('NotificationService', 'Notification created', {
        notificationId: notification.id,
        vendorId: data.vendor_id,
        title: data.title,
      });

      return notification;
    } catch (error) {
      logger.error('NotificationService', 'Error creating notification', error, data);
      throw error;
    }
  }

  /**
   * Create bulk notifications for multiple vendors
   */
  static async createBulkNotifications(data: BulkNotificationData) {
    try {
      const { vendorIds, type, title, message, scope, data: notifData } = data;

      if (!vendorIds || vendorIds.length === 0) {
        return { count: 0 };
      }

      const notificationsData = vendorIds.map(vendorId => ({
        vendor_id: vendorId,
        type,
        title,
        message,
        scope,
        data: notifData || null,
      }));

      const result = await prisma.notification.createMany({
        data: notificationsData,
      });

      logger.info('NotificationService', 'Bulk notifications created', {
        count: result.count,
        vendorIds: vendorIds.length,
        title,
      });

      return result;
    } catch (error) {
      logger.error('NotificationService', 'Error creating bulk notifications', error, data);
      throw error;
    }
  }

  /**
   * Create notification for all users with a specific role
   */
  static async createNotificationForRole(
    role: string,
    type: string,
    title: string,
    message: string,
    scope: NotificationScope,
    data?: string | null
  ) {
    try {
      // Get all users with the specified role
      const users = await prisma.user.findMany({
        where: { 
          role: role as any,
          isActive: true,
          verification_status: 'VERIFIED',
        },
        select: { id: true }
      });

      const vendorIds = users.map(u => u.id);

      if (vendorIds.length === 0) {
        logger.warn('NotificationService', 'No users found for role', { role });
        return { count: 0 };
      }

      const result = await this.createBulkNotifications({
        vendorIds,
        type,
        title,
        message,
        scope,
        data: data ?? null,
      });

      logger.info('NotificationService', 'Notifications created for role', {
        role,
        count: result.count,
      });

      return result;
    } catch (error) {
      logger.error('NotificationService', 'Error creating notifications for role', error, { role });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId?: string, vendorId?: string) {
    try {
      // Check if already read
      const existingRead = await prisma.notificationRead.findFirst({
        where: {
          notification_id: notificationId,
          ...(userId && { user_id: userId }),
          ...(vendorId && { vendor_id: vendorId }),
        }
      });

      if (existingRead) {
        return { success: true, message: 'Notification already marked as read' };
      }

      // Create read record
      const read = await prisma.notificationRead.create({
        data: {
          notification_id: notificationId,
          user_id: userId || null,
          vendor_id: vendorId || null,
        },
      });

      logger.info('NotificationService', 'Notification marked as read', {
        notificationId,
        userId,
        vendorId,
      });

      return read;
    } catch (error) {
      logger.error('NotificationService', 'Error marking notification as read', error, {
        notificationId,
        userId,
        vendorId,
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId?: string, vendorId?: string, scope?: NotificationScope) {
    try {
      const whereClause: any = {};
      if (scope) {
        whereClause.scope = scope;
      }
      if (vendorId) {
        whereClause.vendor_id = vendorId;
      }

      // Get all unread notifications
      const notifications = await prisma.notification.findMany({
        where: whereClause,
        include: {
          reads: {
            where: userId ? { user_id: userId } : vendorId ? { vendor_id: vendorId } : {}
          }
        }
      });

      const unreadNotifications = notifications.filter(n => n.reads.length === 0);

      // Create read records for all unread notifications
      const readRecords = unreadNotifications.map(n => ({
        notification_id: n.id,
        user_id: userId || null,
        vendor_id: vendorId || null,
      }));

      if (readRecords.length > 0) {
        await prisma.notificationRead.createMany({
          data: readRecords,
          skipDuplicates: true,
        });
      }

      logger.info('NotificationService', 'All notifications marked as read', {
        userId,
        vendorId,
        count: readRecords.length,
        scope,
      });

      return { count: readRecords.length };
    } catch (error) {
      logger.error('NotificationService', 'Error marking all notifications as read', error, {
        userId,
        vendorId,
        scope,
      });
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string) {
    try {
      // Delete notification (reads will cascade)
      await prisma.notification.delete({
        where: { id: notificationId },
      });

      logger.info('NotificationService', 'Notification deleted', {
        notificationId,
      });

      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      logger.error('NotificationService', 'Error deleting notification', error, {
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   */
  static async getNotificationStatistics(userId?: string, vendorId?: string) {
    try {
      const whereClause: any = {};
      if (vendorId) {
        whereClause.vendor_id = vendorId;
      }

      const allNotifications = await prisma.notification.findMany({
        where: whereClause,
        include: {
          reads: {
            where: userId ? { user_id: userId } : vendorId ? { vendor_id: vendorId } : {}
          }
        }
      });

      const totalCount = allNotifications.length;
      const unreadCount = allNotifications.filter(n => n.reads.length === 0).length;
      const readCount = totalCount - unreadCount;

      const statistics = {
        total: totalCount,
        unread: unreadCount,
        read: readCount,
        byScope: {
          admin: allNotifications.filter(n => n.scope === 'admin').length,
          vendor: allNotifications.filter(n => n.scope === 'vendor').length,
          reviewer: allNotifications.filter(n => n.scope === 'reviewer').length,
          approver: allNotifications.filter(n => n.scope === 'approver').length,
        },
      };

      logger.debug('NotificationService', 'Notification statistics retrieved', {
        userId,
        vendorId,
        totalCount,
      });

      return statistics;
    } catch (error) {
      logger.error('NotificationService', 'Error fetching notification statistics', error, {
        userId,
        vendorId,
      });
      throw error;
    }
  }

  /**
   * Cleanup old read notifications (housekeeping)
   * Delete notifications older than specified days that have been read
   */
  static async cleanupOldNotifications(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Get notifications older than cutoff that have reads
      const oldNotifications = await prisma.notification.findMany({
        where: {
          created_at: {
            lt: cutoffDate,
          },
        },
        include: {
          reads: true,
        }
      });

      // Filter to only those that have been read
      const readNotificationIds = oldNotifications
        .filter(n => n.reads.length > 0)
        .map(n => n.id);

      if (readNotificationIds.length > 0) {
        await prisma.notification.deleteMany({
          where: {
            id: {
              in: readNotificationIds,
            },
          },
        });
      }

      logger.info('NotificationService', 'Old notifications cleaned up', {
        count: readNotificationIds.length,
        daysOld,
        cutoffDate,
      });

      return { count: readNotificationIds.length };
    } catch (error) {
      logger.error('NotificationService', 'Error cleaning up old notifications', error, {
        daysOld,
      });
      throw error;
    }
  }
}

export default NotificationService;
