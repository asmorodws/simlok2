import type { NotificationItemType } from './types';

export const notificationService = {
  async getNotifications(): Promise<NotificationItemType[]> {
    try {
      const response = await fetch('/api/v1/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  async markAsRead(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
      });
      return response.ok;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  async markAllAsRead(): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/notifications/read-all', {
        method: 'PATCH',
      });
      return response.ok;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  },
};
