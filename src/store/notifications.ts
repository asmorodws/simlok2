import { create } from 'zustand';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  createdAt: string;
  isRead: boolean;
}

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  cursor: string | null;
}

interface NotificationsActions {
  setItems: (items: Notification[]) => void;
  addItem: (item: Notification) => void;
  removeNotifications: (submissionId: string) => void;
  setUnreadCount: (count: number) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (scope?: string, vendorId?: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setCursor: (cursor: string | null) => void;
  reset: () => void;
}

export type NotificationsStore = NotificationsState & NotificationsActions;

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
  hasMore: true,
  cursor: null,
};

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  ...initialState,

  setItems: (items) => set({ items }),

  addItem: (item) => set((state) => ({
    items: [item, ...state.items],
    unreadCount: item.isRead ? state.unreadCount : state.unreadCount + 1,
  })),

  removeNotifications: (submissionId) => set((state) => {
    // Filter out notifications that reference the deleted submission
    const filteredItems = state.items.filter(item => {
      // Check if notification data contains the submission ID
      if (item.data) {
        try {
          const data = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
          if (data.submissionId === submissionId || data.submission_id === submissionId) {
            return false; // Remove this notification
          }
        } catch (e) {
          // If parsing fails, check message/title
        }
      }
      
      // Check message and title for submission ID
      const hasIdInMessage = item.message.includes(submissionId);
      const hasIdInTitle = item.title.includes(submissionId);
      
      return !hasIdInMessage && !hasIdInTitle; // Keep if ID not found
    });
    
    // Calculate how many unread notifications were removed
    const removedUnreadCount = state.items.filter(item => {
      if (item.isRead) return false; // Skip already read notifications
      
      // Check if this notification references the deleted submission
      if (item.data) {
        try {
          const data = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
          if (data.submissionId === submissionId || data.submission_id === submissionId) {
            return true; // This unread notification will be removed
          }
        } catch (e) {
          // If parsing fails, check message/title
        }
      }
      
      const hasIdInMessage = item.message.includes(submissionId);
      const hasIdInTitle = item.title.includes(submissionId);
      
      return hasIdInMessage || hasIdInTitle; // Count if ID found
    }).length;
    
    console.log(`Removing ${state.items.length - filteredItems.length} notifications for submission ${submissionId}`);
    console.log(`Reducing unread count by ${removedUnreadCount}`);
    
    return {
      items: filteredItems,
      unreadCount: Math.max(0, state.unreadCount - removedUnreadCount),
    };
  }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  markAsRead: async (id) => {
    // Update local state optimistically
    set((state) => ({
      items: state.items.map(item => 
        item.id === id ? { ...item, isRead: true } : item
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    // Make API call to update server
    try {
      const response = await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Update unread count from server response
        if (result.data?.unreadCount !== undefined) {
          set({ unreadCount: result.data.unreadCount });
        }
        console.log('✅ Notification marked as read on server:', id);
      } else {
        console.error('❌ Failed to mark notification as read on server:', response.statusText);
        // Revert optimistic update on failure
        set((state) => ({
          items: state.items.map(item => 
            item.id === id ? { ...item, isRead: false } : item
          ),
          unreadCount: state.unreadCount + 1,
        }));
      }
    } catch (error) {
      console.error('💥 Error marking notification as read:', error);
      // Revert optimistic update on error
      set((state) => ({
        items: state.items.map(item => 
          item.id === id ? { ...item, isRead: false } : item
        ),
        unreadCount: state.unreadCount + 1,
      }));
    }
  },

  markAllAsRead: async (scope?: string, vendorId?: string) => {
    // Update local state optimistically
    set((state) => ({
      items: state.items.map(item => ({ ...item, isRead: true })),
      unreadCount: 0,
    }));

    // Make API call to update server
    try {
      const response = await fetch('/api/v1/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scope,
          vendorId,
        }),
      });

      if (response.ok) {
        await response.json(); // Consume response
        console.log('✅ All notifications marked as read on server');
        // Ensure unread count is 0
        set({ unreadCount: 0 });
      } else {
        console.error('❌ Failed to mark all notifications as read on server:', response.statusText);
      }
    } catch (error) {
      console.error('💥 Error marking all notifications as read:', error);
    }
  },

  setLoading: (loading) => set({ loading }),

  setHasMore: (hasMore) => set({ hasMore }),

  setCursor: (cursor) => set({ cursor }),

  reset: () => set(initialState),
}));
