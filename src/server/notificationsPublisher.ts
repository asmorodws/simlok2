/**
 * Real-time Notifications Publisher using Redis
 * Publishes notifications to Redis channels for Server-Sent Events
 */

import { redisPub } from '@/lib/singletons';
import type { NotificationNewEvent, NotificationUnreadCountEvent } from '@/shared/events';

export class NotificationsPublisher {
  /**
   * Publish new notification to real-time subscribers
   */
  async publishNotification(notification: NotificationNewEvent) {
    try {
      const channelName = notification.scope === 'admin' 
        ? 'notifications:admin' 
        : `notifications:vendor:${notification.vendorId}`;
      
      const message = JSON.stringify({
        type: 'notification:new',
        data: notification
      });

      await redisPub.publish(channelName, message);
      console.log(`📡 Published notification to ${channelName}:`, notification.title);
    } catch (error) {
      console.error('❌ Error publishing notification:', error);
    }
  }

  /**
   * Publish unread count update to real-time subscribers
   */
  async publishUnreadCount(update: NotificationUnreadCountEvent) {
    try {
      const channelName = update.scope === 'admin' 
        ? 'notifications:admin' 
        : `notifications:vendor:${update.vendorId}`;
      
      const message = JSON.stringify({
        type: 'notification:unread_count',
        data: update
      });

      await redisPub.publish(channelName, message);
      console.log(`📊 Published unread count to ${channelName}:`, update.unreadCount);
    } catch (error) {
      console.error('❌ Error publishing unread count:', error);
    }
  }

  /**
   * Publish stats update to real-time subscribers
   */
  async publishStatsUpdate(scope: 'admin' | 'vendor', vendorId: string | undefined, changes: Record<string, any>) {
    try {
      const channelName = scope === 'admin' 
        ? 'notifications:admin' 
        : `notifications:vendor:${vendorId}`;
      
      const message = JSON.stringify({
        type: 'stats:update',
        data: { scope, vendorId, changes }
      });

      await redisPub.publish(channelName, message);
      console.log(`📈 Published stats update to ${channelName}:`, changes);
    } catch (error) {
      console.error('❌ Error publishing stats update:', error);
    }
  }
}

// Export singleton instance
export const notificationsPublisher = new NotificationsPublisher();
