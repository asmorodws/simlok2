'use client';

/**
 * Notifications Panel Component
 * Shows list of notifications with mark as read functionality
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { notificationService } from '../notificationService';
import { useNotificationsStore } from '@/store/notifications';
import { NotificationItem } from './NotificationItem';
import UserVerificationModal from '@/components/admin/UserVerificationModal';
import { UserData } from '@/types/user';
import type { NotificationsPanelProps, NotificationItemType } from '../types';

export function NotificationsPanel({ 
  isOpen, 
  onClose, 
  scope, 
  vendorId 
}: NotificationsPanelProps) {
  const { data: session } = useSession();
  const { setUnreadCount } = useNotificationsStore();
  
  const [notifications, setNotifications] = useState<NotificationItemType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  
  // Modal states
  const [selectedVendorUser, setSelectedVendorUser] = useState<UserData | null>(null);

  // Debug state changes
  useEffect(() => {
    console.log('🔄 Modal state changed:', { selectedVendorUser: selectedVendorUser?.id });
  }, [selectedVendorUser]);

  const fetchNotifications = useCallback(async (cursor?: string) => {
    if (!session?.user) return;

    try {
      setIsLoading(true);
      const response = await notificationService.fetchNotifications({
        scope,
        vendorId: scope === 'vendor' ? (vendorId || session.user.id) : undefined,
        cursor,
        limit: 20,
      });

      if (cursor) {
        // Load more - append to existing list
        setNotifications(prev => [...prev, ...response.data]);
      } else {
        // Fresh load - replace list
        setNotifications(response.data);
      }

      setHasMore(response.pagination.hasMore);
      setNextCursor(response.pagination.nextCursor);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, scope, vendorId]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      const result = await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      
      // Update global unread count
      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [setUnreadCount]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead(
        scope, 
        scope === 'vendor' ? (vendorId || session?.user?.id) : undefined
      );
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      
      // Update global unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [scope, vendorId, session, setUnreadCount]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor && !isLoading) {
      fetchNotifications(nextCursor);
    }
  }, [nextCursor, isLoading, fetchNotifications]);
  
  // Function to fetch vendor user data
  const fetchVendorData = useCallback(async (vendorId: string) => {
    try {
      console.log('🔍 Fetching vendor data for ID:', vendorId);
      const response = await fetch(`/api/admin/users/${vendorId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch vendor details');
      }
      
      const data = await response.json();
      console.log('✅ Vendor user data fetched:', data);
      
      setSelectedVendorUser(data.user);
      console.log('🚀 Opening user verification modal for vendorId:', vendorId);
    } catch (err) {
      console.error('❌ Error fetching vendor details:', err);
      alert('Gagal memuat detail vendor');
    }
  }, []);

  const handleNotificationClick = useCallback((notification: NotificationItemType) => {
    console.log('🖱️ CLICKED NOTIFICATION:', notification.type, notification.title);
    
    // Mark as read if not already read
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // Handle navigation or action based on notification type
    if (notification.data) {
      try {
        const data = JSON.parse(notification.data);
        console.log('📊 NOTIFICATION DATA:', data);
        
        // Handle different notification types
        switch (notification.type) {
          case 'new_submission':
            console.log('🏃 Navigating to submission:', data.submissionId);
            window.location.href = `/dashboard/submissions/${data.submissionId}`;
            break;
          case 'new_vendor':
            console.log('👤 OPENING VENDOR MODAL - vendorId:', data.vendorId);
            if (data.vendorId) {
              // Fetch vendor user data
              fetchVendorData(data.vendorId);
            } else {
              console.error('❌ NO VENDOR ID FOUND');
            }
            break;
          case 'status_change':
            console.log('🔄 Navigating to submission for status change:', data.submissionId);
            window.location.href = `/dashboard/submissions/${data.submissionId}`;
            break;
          default:
            console.log('❓ Unknown notification type:', notification.type);
        }
      } catch (error) {
        console.error('❌ PARSE ERROR:', error);
        console.log('📋 RAW DATA:', notification.data);
      }
    } else {
      console.log('⚠️ NO DATA FOUND');
    }
  }, [handleMarkAsRead, fetchVendorData]);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  if (!isOpen) return null;

  const unreadNotifications = notifications.filter(n => !n.isRead);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Notifications
        </h2>
        <div className="flex items-center gap-2">
          {/* Test Button */}
          <button
            onClick={() => {
              console.log('🧪 TEST BUTTON CLICKED');
              fetchVendorData('cmeg7fce10003silbg30j9em8');
            }}
            className="text-xs bg-red-500 text-white px-2 py-1 rounded"
          >
            Test Modal
          </button>
          
          {unreadNotifications.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckIcon className="w-4 h-4" />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (!notifications || notifications.length === 0) ? (
            <div className="p-4 text-center text-gray-500">
              Loading notifications...
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications yet
            </div>
          ) : (
            <>
              {Array.isArray(notifications) && notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onClick={handleNotificationClick}
                />
              ))}
              
              {hasMore && (
                <div className="p-4 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* User Verification Modal */}
      {selectedVendorUser && (
        <UserVerificationModal
          isOpen={!!selectedVendorUser}
          onClose={() => {
            console.log('🚪 Closing vendor user modal');
            setSelectedVendorUser(null);
          }}
          user={selectedVendorUser}
          onUserUpdate={(updatedUser) => {
            setSelectedVendorUser(updatedUser);
          }}
          onUserRemove={() => {
            setSelectedVendorUser(null);
          }}
        />
      )}
    </>
  );
}
