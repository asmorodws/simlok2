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

  // ====== READ SINGLE (optimistic + guarded decrement + scoped refetch) ======
  markAsRead: async (id, params) => {
    const { refetch = true, scope, vendorId } = params || {};

    const before = get().items.find((n) => n.id === id);
    const wasUnread = before ? !before.isRead : false;

    // Optimistic
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, isRead: true } : item
      ),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));

    try {
      const result = await fetchJSON<{ success: boolean; data?: { unreadCount?: number } }>(
        `/api/v1/notifications/${id}/read`,
        { method: 'POST' }
      );

      if (result?.data?.unreadCount !== undefined) {
        set({ unreadCount: Math.max(0, result.data.unreadCount) });
      }

      if (refetch) {
        setTimeout(() => {
          if (scope) {
            get().reload({ scope, ...(scope === 'vendor' && vendorId ? { vendorId } : {}) });
          } else {
            get().reload();
          }
        }, 200);
      }
    } catch (error) {
      console.error('💥 Error markAsRead:', error);
      if (wasUnread) {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, isRead: false } : item
          ),
          unreadCount: state.unreadCount + 1,
        }));
      }
    }
  },

  // ====== READ ALL (optimistic + scoped refetch) ======
  markAllAsRead: async (params) => {
    const { scope, vendorId, refetch = true } = params || {};

    const unreadBefore = get().items.filter((n) => !n.isRead).length;

    set((state) => ({
      items: state.items.map((item) => ({ ...item, isRead: true })),
      unreadCount: Math.max(0, state.unreadCount - unreadBefore),
    }));

    try {
      const result = await fetchJSON<{ success: boolean; data?: { unreadCount?: number } }>(
        `/api/v1/notifications/read-all`,
        {
          method: 'POST',
          body: JSON.stringify({ scope, vendorId }),
        }
      );

      if (result?.success && result?.data?.unreadCount !== undefined) {
        set({ unreadCount: Math.max(0, result.data.unreadCount) });
      } else {
        set({ unreadCount: 0 });
      }

      if (refetch) {
        setTimeout(() => {
          if (scope) {
            get().reload({ scope, ...(scope === 'vendor' && vendorId ? { vendorId } : {}) });
          } else {
            get().reload();
          }
        }, 200);
      }
    } catch (error) {
      console.error('💥 Error markAllAsRead:', error);
      if (scope) {
        get().reload({ scope, ...(scope === 'vendor' && vendorId ? { vendorId } : {}) });
      } else {
        get().reload();
      }
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

  reset: () => set(initialState),
}));
