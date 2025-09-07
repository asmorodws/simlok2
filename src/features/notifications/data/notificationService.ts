/**
 * Notification Data Services
 */

import type { NotificationItem } from '../types';

interface FetchNotificationsParams {
  scope: 'admin' | 'vendor';
  vendorId?: string | undefined;
  cursor?: string | undefined;
  limit?: number;
}

interface NotificationsResponse {
  data: NotificationItem[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

class NotificationService {
  private baseUrl = '/api/v1/notifications';

  async fetchNotifications(params: FetchNotificationsParams): Promise<NotificationsResponse> {
    const searchParams = new URLSearchParams({
      scope: params.scope,
      limit: (params.limit || 10).toString(),
    });

    if (params.vendorId) {
      searchParams.set('vendorId', params.vendorId);
    }

    if (params.cursor) {
      searchParams.set('cursor', params.cursor);
    }

    const response = await fetch(`${this.baseUrl}?${searchParams}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.statusText}`);
    }

    const result = await response.json();
    
    // API v1 returns nested structure: {success: true, data: {data: [...], pagination: {...}}}
    return {
      data: result.data?.data || [],
      pagination: result.data?.pagination || { nextCursor: null, hasMore: false }
    };
  }

  async markAsRead(notificationId: string): Promise<{ unreadCount: number }> {
    const response = await fetch(`${this.baseUrl}/${notificationId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to mark as read: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || { unreadCount: 0 };
  }

  async markAllAsRead(scope: 'admin' | 'vendor', vendorId?: string): Promise<{ markedCount: number }> {
    const response = await fetch(`${this.baseUrl}/read-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scope,
        vendorId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to mark all as read: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || { markedCount: 0 };
  }
}

export const notificationService = new NotificationService();
