'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { useNotificationsStore } from '../store/notifications';
import { useStatsStore } from '../store/stats';
import { useListsStore } from '../store/lists';
import { EVENT_NAMES } from '../shared/events';
import type {
  AdminNewSubmissionEvent,
  AdminNewVendorEvent,
  VendorSubmissionStatusChangedEvent,
  NotificationNewEvent,
  NotificationUnreadCountEvent,
  StatsUpdateEvent
} from '../shared/events';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);
  
  const { addItem: addNotification, setUnreadCount } = useNotificationsStore();
  const { updateStats } = useStatsStore();
  const { addSubmission, updateSubmission, addVendor } = useListsStore();

  // Disable Socket.IO in favor of Server-Sent Events
  const SOCKET_ENABLED = false;

  useEffect(() => {
    if (!session?.user || !SOCKET_ENABLED) {
      // Clean up socket if user logs out or Socket.IO is disabled
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        isConnectedRef.current = false;
      }
      return;
    }

    // Initialize socket connection only once
    if (!socketRef.current) {
      console.log('Initializing Socket.IO connection...');
      
      socketRef.current = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        autoConnect: true,
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        isConnectedRef.current = true;
        
        // Join appropriate room based on user role
        const joinData = {
          role: session.user.role,
          ...(session.user.role === 'VENDOR' ? { vendorId: session.user.id } : {})
        };
        
        console.log('Joining room with data:', joinData);
        socket.emit('join', joinData);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        isConnectedRef.current = false;
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        isConnectedRef.current = false;
        // Don't retry if connection fails multiple times
        if (error.message.includes('timeout')) {
          console.log('Socket connection timeout - disabling auto-reconnect');
          socket.disconnect();
        }
      });

      // Event listeners
      socket.on(EVENT_NAMES.ADMIN_NEW_SUBMISSION, (payload: AdminNewSubmissionEvent) => {
        console.log('New submission event:', payload);
        // Refresh submissions list or trigger refetch
        if (session.user.role === 'ADMIN') {
          updateStats({ totalSubmissions: 'increment', pendingSubmissions: 'increment' });
        }
      });

      socket.on(EVENT_NAMES.ADMIN_NEW_VENDOR, (payload: AdminNewVendorEvent) => {
        console.log('New vendor event:', payload);
        // Refresh vendors list or trigger refetch
        if (session.user.role === 'ADMIN') {
          updateStats({ totalVendors: 'increment' });
        }
      });

      socket.on(EVENT_NAMES.VENDOR_SUBMISSION_STATUS_CHANGED, (payload: VendorSubmissionStatusChangedEvent) => {
        console.log('Submission status changed:', payload);
        
        // Update submission in the list
        updateSubmission(payload.submissionId, {
          approval_status: payload.status
        });
      });

      socket.on(EVENT_NAMES.NOTIFICATION_NEW, (payload: NotificationNewEvent) => {
        console.log('🔔 New notification received via Socket.IO:', payload);
        
        // Add notification to store (it will show as unread by default)
        addNotification({
          id: payload.id,
          type: 'notification',
          title: payload.title,
          message: payload.message,
          data: null,
          createdAt: payload.createdAt,
          isRead: false
        });
        
        // Note: addNotification already increments unreadCount
        console.log('✅ Notification added to store');
      });

      socket.on(EVENT_NAMES.NOTIFICATION_UNREAD_COUNT, (payload: NotificationUnreadCountEvent) => {
        console.log('Unread count update:', payload);
        setUnreadCount(payload.count);
      });

      socket.on(EVENT_NAMES.STATS_UPDATE, (payload: StatsUpdateEvent) => {
        console.log('Stats update:', payload);
        updateStats(payload.changes as Record<string, number | string>);
      });
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive for the app
    };
  }, [session, addNotification, setUnreadCount, updateStats, addSubmission, updateSubmission, addVendor]);

  return (
    <SocketContext.Provider value={{ 
      socket: socketRef.current, 
      isConnected: isConnectedRef.current 
    }}>
      {children}
    </SocketContext.Provider>
  );
}
