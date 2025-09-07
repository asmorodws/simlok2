'use client';

import { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useNotificationsStore } from '../../store/notifications';
import { useRealTimeNotifications } from '../../hooks/useRealTimeNotifications';
import NotificationsPanel from './NotificationsPanel';

export default function NotificationsBell() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const { 
    items: notifications,
    unreadCount,
    setItems,
    setUnreadCount,
    setCursor,
    setHasMore
  } = useNotificationsStore();

  // Enable real-time notifications via SSE
  const { isConnected } = useRealTimeNotifications();

  console.log('NotificationsBell - Current store state (v3-SSE):', { 
    notifications: notifications?.length, 
    unreadCount,
    isConnected
  });

  // Load initial notifications and unread count
  useEffect(() => {
    if (session?.user) {
      loadNotifications();
    }
  }, [session]);

  // Sync unread count with store items changes
  useEffect(() => {
    if (notifications.length > 0) {
      const calculatedUnreadCount = notifications.filter(n => !n.isRead).length;
      if (calculatedUnreadCount !== unreadCount) {
        setUnreadCount(calculatedUnreadCount);
      }
    }
  }, [notifications, unreadCount, setUnreadCount]);

  const loadNotifications = async () => {
    if (!session?.user) return;

    try {
      const scope = session.user.role === 'ADMIN' ? 'admin' : 'vendor';
      const params = new URLSearchParams({
        scope,
        limit: '10'
      });

      // Add vendorId only for vendor scope
      if (scope === 'vendor' && session.user.id) {
        params.append('vendorId', session.user.id);
      }

      console.log('Loading notifications with params:', params.toString());
      console.log('🚀 Using endpoint: /api/v1/notifications (Build: 2025-09-06-v3)');

      const response = await fetch(`/api/v1/notifications?${params}`);
      if (response.ok) {
        const result = await response.json();
        console.log('Notifications loaded:', result);
        
        // Extract notifications from nested data structure
        const notifications = Array.isArray(result.data?.data) ? result.data.data : [];
        console.log('NotificationsBell - About to setItems with:', notifications);
        setItems(notifications);
        
        // Count unread notifications
        const unreadCount = notifications.filter((n: any) => !n.isRead).length;
        console.log('NotificationsBell - Setting unreadCount to:', unreadCount);
        console.log('NotificationsBell - All notifications:', notifications.map((n: any) => ({ id: n.id, isRead: n.isRead, title: n.title })));
        setUnreadCount(unreadCount);
        
        setCursor(result.data?.pagination?.nextCursor);
        setHasMore(result.data?.pagination?.hasMore || false);
      } else {
        console.error('Failed to load notifications:', response.status, response.statusText);
        const errorData = await response.json();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  if (!session?.user) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationsPanel 
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
