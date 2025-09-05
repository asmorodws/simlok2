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
  setUnreadCount: (count: number) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
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

  setUnreadCount: (count) => set({ unreadCount: count }),

  markAsRead: (id) => set((state) => ({
    items: state.items.map(item => 
      item.id === id ? { ...item, isRead: true } : item
    ),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),

  markAllAsRead: () => set((state) => ({
    items: state.items.map(item => ({ ...item, isRead: true })),
    unreadCount: 0,
  })),

  setLoading: (loading) => set({ loading }),

  setHasMore: (hasMore) => set({ hasMore }),

  setCursor: (cursor) => set({ cursor }),

  reset: () => set(initialState),
}));
