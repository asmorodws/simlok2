'use client';

/**
 * Notification Bell Component
 * Shows unread count badge and opens notification panel
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { useNotificationsStore } from '@/store/notifications';
import { NotificationsPanel } from './NotificationsPanel';
import type { NotificationBellProps } from '../types';

export function NotificationBell({ 
  className = '', 
  size = 'md' 
}: NotificationBellProps) {
  const { data: session } = useSession();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { unreadCount, setUnreadCount, items } = useNotificationsStore();

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const iconClass = `${sizeClasses[size as keyof typeof sizeClasses]} ${className}`;

  // Load initial unread count
  useEffect(() => {
    if (session?.user) {
      loadUnreadCount();
    }
  }, [session]);

  // Sync unread count with store items changes
  useEffect(() => {
    if (items.length > 0) {
      const calculatedUnreadCount = items.filter(item => !item.isRead).length;
      if (calculatedUnreadCount !== unreadCount) {
        setUnreadCount(calculatedUnreadCount);
      }
    }
  }, [items, unreadCount, setUnreadCount]);

  // Refresh unread count when panel closes (to sync with any changes made in panel)
  useEffect(() => {
    if (!isPanelOpen && session?.user) {
      // Small delay to ensure any pending API calls are completed
      const timeoutId = setTimeout(() => {
        loadUnreadCount();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [isPanelOpen, session]);

  const loadUnreadCount = async () => {
    if (!session?.user) return;

    try {
      const scope = session.user.role === 'ADMIN' ? 'admin' : 'vendor';
      
      // Get all notifications to count unread ones
      const params = new URLSearchParams({
        scope,
        limit: '50' // Get enough notifications to count unread properly
      });

      // Add vendorId only for vendor scope
      if (scope === 'vendor' && session.user.id) {
        params.append('vendorId', session.user.id);
      }

      console.log('🔄 Loading unread count with params:', params.toString());

      const response = await fetch(`/api/v1/notifications?${params}`);

      if (response.ok) {
        const result = await response.json();
        // API v1 returns nested structure: {success: true, data: {data: [...], pagination: {...}}}
        const notifications = result.data?.data || [];
        const unreadNotifications = notifications.filter((notification: any) => !notification.isRead);
        
        console.log('📊 Total notifications:', notifications.length);
        console.log('🔴 Unread notifications:', unreadNotifications.length);
        console.log('📋 Unread notification IDs:', unreadNotifications.map((n: any) => n.id));
        
        setUnreadCount(unreadNotifications.length);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  if (!session?.user) {
    return null;
  }

  const scope = session.user.role === 'ADMIN' ? 'admin' : 'vendor';

  return (
    <>
      <button
        onClick={() => setIsPanelOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className={`${iconClass} text-blue-600`} />
        ) : (
          <BellIcon className={iconClass} />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span> 
        )}  
      </button>

      <NotificationsPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        scope={scope}
        {...(scope === 'vendor' && session.user.id && { vendorId: session.user.id })}
      />
    </>
  );
}
