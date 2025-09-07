'use client';

/**
 * Individual Notification Item Component
 */

import { formatDistanceToNow } from 'date-fns';
import { 
  CheckIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  ArrowRightIcon,
  BuildingOffice2Icon,
  UserIcon
} from '@heroicons/react/24/outline';
import type { NotificationItemProps } from '../types';

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onClick 
}: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_submission':
        return <DocumentPlusIcon className="w-5 h-5 text-blue-600" />;
      case 'new_vendor':
        return <UserPlusIcon className="w-5 h-5 text-green-600" />;
      case 'status_change':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const parseNotificationData = () => {
    try {
      return notification.data ? JSON.parse(notification.data) : null;
    } catch (error) {
      console.error('Error parsing notification data:', error);
      return null;
    }
  };

  const getNotificationDetails = () => {
    const data = parseNotificationData();
    
    switch (notification.type) {
      case 'new_vendor':
        if (data) {
          return {
            vendorName: data.vendorName || '',
            officerName: data.officerName || '',
            email: data.email || '',
            hasDetails: true
          };
        }
        break;
      case 'new_submission':
        if (data) {
          return {
            vendorName: data.vendorName || '',
            officerName: data.officerName || '',
            submissionId: data.submissionId || '',
            hasDetails: true
          };
        }
        break;
    }
    
    return { hasDetails: false };
  };

  const handleClick = () => {
    console.log('🖱️ NotificationItem CLICKED:', notification.type, notification.title);
    onClick?.(notification);
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  const details = getNotificationDetails();

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

          {/* Enhanced Details Section */}
          {details.hasDetails && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {notification.type === 'new_vendor' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <BuildingOffice2Icon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Vendor:</span>
                    <span className="text-gray-900">{details.vendorName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Petugas:</span>
                    <span className="text-gray-900">{details.officerName || 'N/A'}</span>
                  </div>
                  {details.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <InformationCircleIcon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700">Email:</span>
                      <span className="text-gray-900">{details.email}</span>
                    </div>
                  )}
                </div>
              )}

              {notification.type === 'new_submission' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <BuildingOffice2Icon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Vendor:</span>
                    <span className="text-gray-900">{details.vendorName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Petugas:</span>
                    <span className="text-gray-900">{details.officerName || 'N/A'}</span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-3 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <button className="inline-flex items-center text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors">
                    {notification.type === 'new_vendor' ? 'Lihat detail' : 'Lihat detail'}
                    <ArrowRightIcon className="w-3 h-3 ml-1" />
                  </button>
                  
                  <span className="text-xs text-gray-500">
                    Klik untuk melihat detail lengkap
                  </span>
                </div>
              </div>
            </div>
          )}
          
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
