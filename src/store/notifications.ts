// src/store/notifications.ts
'use client';

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
  markingAsRead: Set<string>; // Track notifications being marked as read
}

type Scope = 'admin' | 'vendor' | 'reviewer' | 'approver';

interface ReloadParams {
  scope?: Scope | undefined;
  vendorId?: string | undefined;
  cursor?: string | null;
  pageSize?: number;
  search?: string;
  filter?: 'all' | 'unread' | 'read';
}

interface MarkAllParams {
  scope?: Scope | undefined;
  vendorId?: string | undefined;
  refetch?: boolean;
}

interface MarkOneParams {
  scope?: Scope | undefined;
  vendorId?: string | undefined;
  refetch?: boolean;
}

interface NotificationsActions {
  setItems: (items: Notification[]) => void;
  addItem: (item: Notification) => void;
  removeNotifications: (submissionId: string) => void;
  setUnreadCount: (count: number) => void;
  markAsRead: (id: string, params?: MarkOneParams) => Promise<void>;
  markAllAsRead: (params?: MarkAllParams) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setCursor: (cursor: string | null) => void;
  reload: (params?: ReloadParams) => Promise<void>;
  reset: () => void;
}

export type NotificationsStore = NotificationsState & NotificationsActions;

// ===== util fetch JSON (no-store + cache buster) =====
async function fetchJSON<T>(url: string, init: RequestInit = {}): Promise<T> {
  const busted = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  const res = await fetch(busted, {
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const j = await res.json();
      msg = (j as any)?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
  hasMore: true,
  cursor: null,
  markingAsRead: new Set<string>(),
};

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  ...initialState,

  setItems: (items) => set({ items }),

  addItem: (item) =>
    set((state) => ({
      items: [item, ...state.items],
      unreadCount: item.isRead ? state.unreadCount : state.unreadCount + 1,
    })),

  removeNotifications: (submissionId) =>
    set((state) => {
      const filteredItems = state.items.filter((item) => {
        if (item.data) {
          try {
            const data =
              typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
            if (data.submissionId === submissionId || data.submission_id === submissionId) {
              return false;
            }
          } catch {}
        }
        const hasIdInMessage = item.message.includes(submissionId);
        const hasIdInTitle = item.title.includes(submissionId);
        return !hasIdInMessage && !hasIdInTitle;
      });

      const removedUnreadCount = state.items.filter((item) => {
        if (item.isRead) return false;
        if (item.data) {
          try {
            const data =
              typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
            if (data.submissionId === submissionId || data.submission_id === submissionId) {
              return true;
            }
          } catch {}
        }
        const hasIdInMessage = item.message.includes(submissionId);
        const hasIdInTitle = item.title.includes(submissionId);
        return hasIdInMessage || hasIdInTitle;
      }).length;

      return {
        items: filteredItems,
        unreadCount: Math.max(0, state.unreadCount - removedUnreadCount),
      };
    }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  // ====== READ SINGLE (optimistic + race condition protection) ======
  markAsRead: async (id, params) => {
    // Unused params untuk compatibility dengan existing calls
    void params;

    // Prevent race condition
    const state = get();
    if (state.markingAsRead.has(id)) {
      console.log('⚠️ Already marking notification as read:', id);
      return;
    }

    const before = state.items.find((n) => n.id === id);
    if (!before) {
      console.warn('⚠️ Notification not found:', id);
      return;
    }

    if (before.isRead) {
      console.log('ℹ️ Notification already read:', id);
      return;
    }

    try {
      // Mark as being processed
      set((state) => ({
        ...state,
        markingAsRead: new Set([...state.markingAsRead, id])
      }));

      console.log('📤 Marking notification as read:', id);

      // Optimistic update
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, isRead: true } : item
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));

      // API call
      const result = await fetchJSON<{ success: boolean; data?: { unreadCount?: number } }>(
        `/api/v1/notifications/${id}/read`,
        { method: 'POST' }
      );

      console.log('✅ Successfully marked as read:', id);

      // Update unread count from server if provided
      if (result?.data?.unreadCount !== undefined) {
        set({ unreadCount: Math.max(0, result.data.unreadCount) });
      }

      // No need to refetch data as we already have optimistic update
      // The notification stays in the list but shows as read

    } catch (error) {
      console.error('💥 Error markAsRead:', error);
      
      // Rollback optimistic update
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, isRead: false } : item
        ),
        unreadCount: state.unreadCount + 1,
      }));
      
      throw error; // Re-throw for caller to handle
    } finally {
      // Remove from processing set
      set((state) => {
        const newMarkingAsRead = new Set(state.markingAsRead);
        newMarkingAsRead.delete(id);
        return { ...state, markingAsRead: newMarkingAsRead };
      });
    }
  },

  // ====== READ ALL (optimistic without refetch) ======
  markAllAsRead: async (params) => {
    const { scope, vendorId } = params || {};

    const state = get();
    const unreadBefore = state.items.filter((n) => !n.isRead).length;
    
    if (unreadBefore === 0) {
      console.log('ℹ️ No unread notifications to mark');
      return;
    }

    try {
      console.log('📤 Marking all notifications as read...');

      // Optimistic update
      set((state) => ({
        items: state.items.map((item) => ({ ...item, isRead: true })),
        unreadCount: 0,
      }));

      // API call
      await fetchJSON<{ success: boolean; data?: { unreadCount?: number } }>(
        `/api/v1/notifications/read-all`,
        {
          method: 'POST',
          body: JSON.stringify({ scope, vendorId }),
        }
      );

      console.log('✅ Successfully marked all as read');

      // Ensure unread count is 0
      set({ unreadCount: 0 });

    } catch (error) {
      console.error('💥 Error markAllAsRead:', error);
      
      // Rollback - reload current state
      const currentItems = get().items;
      const actualUnreadCount = currentItems.filter(n => !n.isRead).length;
      set({ unreadCount: actualUnreadCount });
      
      throw error;
    }
  },

  setLoading: (loading) => set({ loading }),

  setHasMore: (hasMore) => set({ hasMore }),

  setCursor: (cursor) => set({ cursor }),

  // ====== Reload daftar (no-store + cache buster) + scoped ======
  reload: async (params) => {
    const {
      scope = 'vendor',
      vendorId,
      cursor = null,
      pageSize = 20,
      search,
      filter = 'all',
    } = params || {};

    try {
      set({ loading: true });

      const query = new URLSearchParams();
      if (scope) query.set('scope', scope);
      if (scope === 'vendor' && vendorId) query.set('vendorId', vendorId);
      if (cursor) query.set('cursor', cursor);
      if (pageSize) query.set('pageSize', String(pageSize));
      if (search) query.set('search', search);
      if (filter) query.set('filter', filter);

      const res = await fetchJSON<{
        success: boolean;
        data: {
          data: Notification[];
          pagination?: { nextCursor?: string | null; hasMore?: boolean };
        };
      }>(`/api/v1/notifications?${query.toString()}`);

      const list = res?.data?.data ?? [];
      const nextCursor = res?.data?.pagination?.nextCursor ?? null;
      const hasMore = !!res?.data?.pagination?.hasMore;

      const newUnread = list.filter((n) => !n.isRead).length;

      set({
        items: list,
        cursor: nextCursor,
        hasMore,
        unreadCount: newUnread,
        loading: false,
      });
    } catch (e) {
      console.error('💥 reload notifications failed:', e);
      set({ loading: false });
    }
  },

  reset: () => set({ ...initialState, markingAsRead: new Set<string>() }),
}));
