/**
 * Simplified Notification Repository 
 * 
 * Based on actual Prisma schema structure
 */

import { Notification, NotificationRead, Prisma, NotificationScope } from '@prisma/client';
import { BaseRepository } from '../base/BaseRepository';

export interface NotificationWithReadStatus extends Notification {
  isRead: boolean;
  readAt?: Date | null;
}

export class NotificationRepository extends BaseRepository<
  Notification,
  Prisma.NotificationCreateInput,
  Prisma.NotificationUpdateInput
> {
  protected getModel() {
    return this.prisma.notification;
  }

  /**
   * Find notifications by scope and vendor ID with read status
   */
  async findByScopeWithReadStatus(
    scope: NotificationScope,
    vendorId: string | null,
    userId: string,
    options: { 
      limit?: number;
      offset?: number;
      type?: string;
    } = {}
  ): Promise<NotificationWithReadStatus[]> {
    const { limit = 20, offset = 0, type } = options;

    const whereClause: Prisma.NotificationWhereInput = {
      scope,
      ...(vendorId && { vendor_id: vendorId }),
      ...(type && { type })
    };

    const notifications = await this.prisma.notification.findMany({
      where: whereClause,
      include: {
        reads: {
          where: { user_id: userId },
          select: { read_at: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    });

    return notifications.map(notification => ({
      ...notification,
      isRead: notification.reads.length > 0,
      readAt: notification.reads[0]?.read_at || null,
      reads: undefined // Remove from response
    }));
  }

  /**
   * Count unread notifications by scope
   */
  async countUnreadByScope(
    scope: NotificationScope, 
    vendorId: string | null,
    userId: string
  ): Promise<number> {
    const whereClause: Prisma.NotificationWhereInput = {
      scope,
      ...(vendorId && { vendor_id: vendorId }),
      reads: {
        none: {
          user_id: userId
        }
      }
    };

    return this.count(whereClause);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<NotificationRead> {
    return this.prisma.notificationRead.upsert({
      where: {
        notification_id_user_id: {
          notification_id: notificationId,
          user_id: userId
        }
      },
      create: {
        notification_id: notificationId,
        user_id: userId,
        read_at: new Date()
      },
      update: {
        read_at: new Date()
      }
    });
  }

  /**
   * Mark all notifications as read for a user by scope
   */
  async markAllAsReadByScope(
    userId: string, 
    scope?: NotificationScope,
    vendorId?: string
  ): Promise<number> {
    const whereClause: Prisma.NotificationWhereInput = {
      reads: {
        none: {
          user_id: userId
        }
      },
      ...(scope && { scope }),
      ...(vendorId && { vendor_id: vendorId })
    };

    // Get unread notifications
    const unreadNotifications = await this.prisma.notification.findMany({
      where: whereClause,
      select: { id: true }
    });

    if (unreadNotifications.length === 0) {
      return 0;
    }

    // Batch create notification reads
    const notificationReads = unreadNotifications.map(notification => ({
      notification_id: notification.id,
      user_id: userId,
      read_at: new Date()
    }));

    await this.prisma.notificationRead.createMany({
      data: notificationReads,
      skipDuplicates: true
    });

    return notificationReads.length;
  }

  /**
   * Create bulk notifications with proper scope
   */
  async createBulkByScope(
    scope: NotificationScope,
    notifications: Array<{
      vendor_id?: string;
      type: string;
      title: string;
      message: string;
      data?: string;
    }>
  ): Promise<number> {
    const result = await this.prisma.notification.createMany({
      data: notifications.map(notification => ({
        scope,
        vendor_id: notification.vendor_id || null,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || null,
        created_at: new Date()
      }))
    });

    return result.count;
  }

  /**
   * Get notification statistics by scope
   */
  async getStatisticsByScope(
    scope?: NotificationScope,
    vendorId?: string
  ): Promise<{
    total: number;
    byType: Record<string, number>;
  }> {
    const whereClause: Prisma.NotificationWhereInput = {
      ...(scope && { scope }),
      ...(vendorId && { vendor_id: vendorId })
    };

    const [total, byType] = await Promise.all([
      this.count(whereClause),
      this.prisma.notification.groupBy({
        by: ['type'],
        where: whereClause,
        _count: { _all: true }
      })
    ]);

    const typeStats = byType.reduce((acc, item) => {
      acc[item.type] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byType: typeStats
    };
  }

  /**
   * Clean up old notifications (maintenance)
   */
  async cleanupOldNotifications(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // First delete notification reads
    await this.prisma.notificationRead.deleteMany({
      where: {
        notification: {
          created_at: { lt: cutoffDate }
        }
      }
    });

    // Then delete notifications
    const result = await this.prisma.notification.deleteMany({
      where: {
        created_at: { lt: cutoffDate }
      }
    });

    return result.count;
  }
}

// Export singleton instance
export const notificationRepository = new NotificationRepository();