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
      let channelName: string;
      
      switch (notification.scope) {
        case 'admin':
          channelName = 'notifications:admin';
          break;
        case 'reviewer':
          channelName = 'notifications:reviewer';
          break;
        case 'approver':
          channelName = 'notifications:approver';
          break;
        case 'vendor':
          channelName = `notifications:vendor:${notification.vendorId}`;
          break;
        default:
          throw new Error(`Unknown notification scope: ${notification.scope}`);
      }
      
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
      let channelName: string;
      
      switch (update.scope) {
        case 'admin':
          channelName = 'notifications:admin';
          break;
        case 'reviewer':
          channelName = 'notifications:reviewer';
          break;
        case 'approver':
          channelName = 'notifications:approver';
          break;
        case 'vendor':
          channelName = `notifications:vendor:${update.vendorId}`;
          break;
        default:
          throw new Error(`Unknown notification scope: ${update.scope}`);
      }
      
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
  async publishStatsUpdate(scope: 'admin' | 'vendor' | 'reviewer' | 'approver', vendorId: string | undefined, changes: Record<string, any>) {
    try {
      let channelName: string;
      
      switch (scope) {
        case 'admin':
          channelName = 'notifications:admin';
          break;
        case 'reviewer':
          channelName = 'notifications:reviewer';
          break;
        case 'approver':
          channelName = 'notifications:approver';
          break;
        case 'vendor':
          channelName = `notifications:vendor:${vendorId}`;
          break;
        default:
          throw new Error(`Unknown stats scope: ${scope}`);
      }
      
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

  /**
   * Publish notification removal to all subscribers
   */
  async publishNotificationRemoval(removal: { submissionId: string; timestamp: string }) {
    try {
      // Publish to both admin and vendor channels since notifications can affect both
      const channels = ['notifications:admin'];
      
      // Also publish to all vendor channels (we could make this more specific later)
      // For now, we'll just publish to admin and let clients handle filtering
      
      const message = JSON.stringify({
        type: 'notification:removed',
        data: removal
      });

      for (const channelName of channels) {
        await redisPub.publish(channelName, message);
      }
      
      // Also publish to a general notification channel that all clients can subscribe to
      await redisPub.publish('notifications:all', message);
      
      console.log(`🗑️ Published notification removal for submission ${removal.submissionId}`);
    } catch (error) {
      console.error('❌ Error publishing notification removal:', error);
    }
  }
}

// Export singleton instance
export const notificationsPublisher = new NotificationsPublisher();
