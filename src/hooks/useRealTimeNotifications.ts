import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useNotificationsStore } from '@/store/notifications';

interface SSEMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp?: string;
}

export function useRealTimeNotifications() {
  const { data: session } = useSession();
  const eventSourceRef = useRef<EventSource | null>(null);
  const { addItem, setUnreadCount, removeNotifications } = useNotificationsStore();

  useEffect(() => {
    if (!session?.user) {
      // Clean up EventSource if user logs out
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    // Don't create multiple connections
    if (eventSourceRef.current) {
      return;
    }

    const scope = session.user.role === 'ADMIN' ? 'admin' : 'vendor';
    const params = new URLSearchParams({ scope });
    
    if (scope === 'vendor' && session.user.id) {
      params.append('vendorId', session.user.id);
    }

    console.log('Establishing SSE connection for notifications...');
    
    const eventSource = new EventSource(`/api/notifications/stream?${params.toString()}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened');
    };

    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        console.log('SSE message received:', message);

        switch (message.type) {
          case 'connected':
            console.log('Real-time notifications connected:', message.message);
            break;

          case 'notification:new':
            if (message.data) {
              console.log('New notification via SSE:', message.data);
              
              // Add notification to store with proper data
              addItem({
                id: message.data.id,
                type: message.data.type || 'notification', // Use actual notification type
                title: message.data.title,
                message: message.data.message,
                data: message.data.data || null, // Preserve the data field from server
                createdAt: message.data.createdAt,
                isRead: false
              });
            }
            break;

          case 'notification:unread_count':
            if (message.data?.unreadCount !== undefined) {
              console.log('Unread count update via SSE:', message.data.unreadCount);
              setUnreadCount(message.data.unreadCount);
            }
            break;

          case 'notification:removed':
            if (message.data?.submissionId) {
              console.log('Notification removal via SSE for submission:', message.data.submissionId);
              removeNotifications(message.data.submissionId);
            }
            break;

          case 'stats:update':
            console.log('Stats update via SSE:', message.data);
            // You can emit this to stats store if needed
            break;

          case 'heartbeat':
            // Keep-alive message, no action needed
            break;

          default:
            console.log('Unknown SSE message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      
      // Automatic reconnection will be handled by the browser
      // but we can add custom logic here if needed
      
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('SSE connection closed');
        eventSourceRef.current = null;
      }
    };

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        console.log('Closing SSE connection');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [session, addItem, setUnreadCount, removeNotifications]);

  return {
    isConnected: typeof window !== 'undefined' && eventSourceRef.current?.readyState === EventSource.OPEN,
    eventSource: eventSourceRef.current
  };
}
