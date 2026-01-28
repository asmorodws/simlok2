'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  CheckIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  scope: string;
  type: string;
  title: string;
  message: string;
  data: string | null;
  read_at: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    }
  }, [page, showUnreadOnly, session?.user]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (showUnreadOnly) {
        params.append('unread', 'true');
      }

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.data.notifications);
        setPagination(data.data.pagination);
        setUnreadCount(data.data.unreadCount);
      } else {
        toast.error(data.error || 'Failed to fetch notifications');
      }
    } catch (error) {
      toast.error('An error occurred while fetching notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchNotifications();
      } else {
        toast.error(data.error || 'Failed to mark as read');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchNotifications();
      } else {
        toast.error(data.error || 'Failed to mark all as read');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUBMISSION':
        return '📄';
      case 'REVIEW':
        return '🔍';
      case 'APPROVAL':
        return '✅';
      case 'ALERT':
        return '⚠️';
      case 'SYSTEM':
        return '🔔';
      default:
        return '📬';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm text-primary-700 hover:bg-primary-50 rounded-lg transition"
          >
            <CheckIcon className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showUnreadOnly}
            onChange={(e) => {
              setShowUnreadOnly(e.target.checked);
              setPage(1);
            }}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Show unread only</span>
        </label>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <InboxIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">
              {showUnreadOnly ? 'All notifications are read' : 'You have no notifications yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition ${
                    !notification.read_at ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                          <p className="text-gray-700 mt-1">{notification.message}</p>
                          <p className="text-sm text-gray-500 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read_at && (
                          <button
                            onClick={() => markAsRead([notification.id])}
                            className="flex-shrink-0 p-1 text-primary-600 hover:bg-primary-50 rounded"
                            title="Mark as read"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
