export interface NotificationBellProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  unreadCount?: number;
  onClick?: () => void;
}

export interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClick?: () => void;
  onMarkAsRead?: (id: string) => void;
}

export interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItemType[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export interface NotificationItemType {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
}
