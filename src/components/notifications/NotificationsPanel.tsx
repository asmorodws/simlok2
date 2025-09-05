'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useNotificationsStore } from '../../store/notifications';
import type { Notification } from '../../store/notifications';

export default function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  
  const { 
    items, 
    unreadCount, 
    hasMore, 
    cursor, 
    markAsRead, 
    markAllAsRead, 
    setItems, 
    setCursor, 
    setHasMore 
  } = useNotificationsStore();

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.isRead) return;

    try {
      const response = await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'POST',
      });

      if (response.ok) {
        markAsRead(notification.id);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      setLoading(true);
      const scope = session?.user?.role === 'ADMIN' ? 'admin' : 'vendor';
      
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scope,
          ...(scope === 'vendor' ? { vendorId: session?.user?.id } : {}),
        }),
      });

      if (response.ok) {
        markAllAsRead();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read first
    await handleMarkAsRead(notification);

    // Navigate based on notification type and data
    if (notification.data) {
      try {
        const data = typeof notification.data === 'string' 
          ? JSON.parse(notification.data) 
          : notification.data;

        if (data.submissionId) {
          router.push(`/dashboard/submission/${data.submissionId}`);
          onClose();
        } else if (data.vendorId) {
          router.push(`/dashboard/vendor/${data.vendorId}`);
          onClose();
        }
      } catch (error) {
        console.error('Error parsing notification data:', error);
      }
    }
  };

  const loadMore = async () => {
    if (!hasMore || loading || !session?.user) return;

    try {
      setLoading(true);
      const scope = session.user.role === 'ADMIN' ? 'admin' : 'vendor';
      const params = new URLSearchParams({
        scope,
        ...(scope === 'vendor' ? { vendorId: session.user.id } : {}),
        ...(cursor ? { cursor } : {}),
        limit: '10'
      });

      const response = await fetch(`/api/notifications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setItems([...items, ...data.notifications]);
        setCursor(data.cursor);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Baru saja';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
    
    return date.toLocaleDateString('id-ID');
  };

  return (
    <div 
      ref={panelRef}
      className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notifikasi
        </h3>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
            >
              <CheckIcon className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Tidak ada notifikasi
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                  !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more button */}
        {hasMore && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
            >
              {loading ? 'Memuat...' : 'Muat lebih banyak'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
