/**
 * Notification Types and Interfaces
 */

export interface NotificationItem {
  id: string;
  scope: 'admin' | 'vendor';
  vendorId: string | null;
  type: string;
  title: string;
  message: string;
  data: string | null;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationBellProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  scope: 'admin' | 'vendor';
  vendorId?: string;
}

export interface NotificationItemProps {
  notification: NotificationItem;
  onMarkAsRead: (id: string) => void;
  onClick?: (notification: NotificationItem) => void;
}

export interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}
