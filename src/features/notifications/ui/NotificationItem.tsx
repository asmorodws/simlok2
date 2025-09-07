'use client';

/**
 * Individual Notification Item Component
 */

import { formatDistanceToNow } from 'date-fns';
import { CheckIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { NotificationItemProps } from '../types';

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onClick 
}: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_submission':
      case 'new_vendor':
        return <InformationCircleIcon className="w-5 h-5 text-blue-600" />;
      case 'status_change':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const handleClick = () => {
    onClick?.(notification);
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  return (
    <div
      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.isRead ? 'bg-blue-50' : 'bg-white'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-sm font-medium ${
              !notification.isRead ? 'text-gray-900' : 'text-gray-700'
            }`}>
              {notification.title}
            </h3>
            
            {!notification.isRead && (
              <button
                onClick={handleMarkAsRead}
                className="flex-shrink-0 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                title="Mark as read"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <p className={`text-sm mt-1 ${
            !notification.isRead ? 'text-gray-800' : 'text-gray-600'
          }`}>
            {notification.message}
          </p>
          
          <p className="text-xs text-gray-500 mt-2">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>

        {/* Unread indicator */}
        {!notification.isRead && (
          <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2" />
        )}
      </div>
    </div>
  );
}
