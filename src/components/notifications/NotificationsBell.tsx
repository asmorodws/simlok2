'use client';

import { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { useNotificationsStore } from '../../store/notifications';
import NotificationsPanel from './NotificationsPanel';

export default function NotificationsBell() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotificationsStore();

  // Load initial notifications and unread count
  useEffect(() => {
    if (session?.user) {
      loadNotifications();
    }
  }, [session]);

  const loadNotifications = async () => {
    if (!session?.user) return;

    try {
      const scope = session.user.role === 'ADMIN' ? 'admin' : 'vendor';
      const params = new URLSearchParams({
        scope,
        limit: '10'
      });

      // Only add vendorId for vendor scope
      if (scope === 'vendor') {
        params.append('vendorId', session.user.id);
      }

      console.log('Loading notifications with params:', params.toString());

      const response = await fetch(`/api/notifications?${params}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Notifications loaded:', data);
        
        const { setItems, setUnreadCount, setCursor, setHasMore } = useNotificationsStore.getState();
        
        setItems(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setCursor(data.cursor);
        setHasMore(data.hasMore);
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
