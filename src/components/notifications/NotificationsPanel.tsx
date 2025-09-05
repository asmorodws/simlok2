'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  BellIcon, 
  XMarkIcon,
  CheckIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  UserPlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/button/Button';
import AdminSubmissionDetailModal from '../admin/AdminSubmissionDetailModal';
import SubmissionDetailModal from '../vendor/SubmissionDetailModal';
import { useNotificationsStore, type Notification } from '../../store/notifications';

interface NotificationsPanelProps {
  onClose: () => void;
}

export default function NotificationsPanel({
  onClose
}: NotificationsPanelProps) {
  const { data: session } = useSession();
  const { 
    items: notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useNotificationsStore();
  
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingSubmissionId, setLoadingSubmissionId] = useState<string | null>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleViewDetail = async (notification: Notification) => {
    try {
      // Parse data dari notification untuk mendapatkan submission ID
      let submissionId = null;
      
      if (notification.data) {
        try {
          const parsedData = JSON.parse(notification.data);
          submissionId = parsedData.submissionId || parsedData.submission_id;
        } catch (e) {
          console.error('Error parsing notification data:', e);
        }
      }

      // Jika tidak ada submissionId, coba extract dari message atau title
      if (!submissionId) {
        // Cari pattern ID dalam message atau title
        const idPattern = /ID[:\s]+([a-zA-Z0-9]+)/i;
        const messageMatch = notification.message.match(idPattern);
        const titleMatch = notification.title.match(idPattern);
        
        submissionId = messageMatch?.[1] || titleMatch?.[1];
      }

      if (!submissionId) {
        console.warn('No submission ID found in notification');
        return;
      }

      setLoadingSubmissionId(submissionId);

      // Fetch detail submission
      const response = await fetch(`/api/submissions/${submissionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch submission details');
      }

      const submissionData = await response.json();
      setSelectedSubmission(submissionData);
      setIsDetailModalOpen(true);

      // Mark notification as read
      if (!notification.isRead) {
        markAsRead(notification.id);
      }

    } catch (error) {
      console.error('Error viewing submission detail:', error);
    } finally {
      setLoadingSubmissionId(null);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSubmission(null);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Baru saja';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} menit yang lalu`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} jam yang lalu`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} hari yang lalu`;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'submission_approved':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'submission_rejected':
        return <XMarkIcon className="w-4 h-4 text-red-600" />;
      case 'submission_pending':
        return <ClockIcon className="w-4 h-4 text-amber-600" />;
      case 'new_submission':
        return <DocumentTextIcon className="w-4 h-4 text-blue-600" />;
      case 'user_registered':
        return <UserPlusIcon className="w-4 h-4 text-purple-600" />;
      default:
        return <BellIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'submission_approved':
        return 'Disetujui';
      case 'submission_rejected':
        return 'Ditolak';
      case 'submission_pending':
        return 'Pending';
      case 'new_submission':
        return 'Pengajuan Baru';
      case 'user_registered':
        return 'User Baru';
      default:
        return 'Notifikasi';
    }
  };

  const getNotificationBgColor = (type: string, isRead: boolean) => {
    const baseClasses = isRead 
      ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700' 
      : 'bg-white dark:bg-gray-800 border-l-4';
    
    if (isRead) return baseClasses;

    switch (type) {
      case 'submission_approved':
        return `${baseClasses} border-l-green-500 bg-green-50/50 dark:bg-green-900/20`;
      case 'submission_rejected':
        return `${baseClasses} border-l-red-500 bg-red-50/50 dark:bg-red-900/20`;
      case 'submission_pending':
        return `${baseClasses} border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/20`;
      case 'new_submission':
        return `${baseClasses} border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/20`;
      case 'user_registered':
        return `${baseClasses} border-l-purple-500 bg-purple-50/50 dark:bg-purple-900/20`;
      default:
        return `${baseClasses} border-l-gray-500 bg-gray-50/50 dark:bg-gray-900/20`;
    }
  };

  const hasSubmissionData = (notification: Notification) => {
    // Check if notification contains submission data that can be viewed
    return notification.type.includes('submission') || 
           (notification.data && notification.data.includes('submissionId')) ||
           notification.message.includes('ID') ||
           notification.title.includes('ID');
  };

  if (!notifications) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Floating Panel */}
      <div className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[500px] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <BellIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-[8px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Notifikasi
              </h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {unreadCount} belum dibaca
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                size="sm"
                className="text-xs px-3 py-1.5 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <CheckIcon className="w-3 h-3 mr-1" />
                Tandai Semua
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <XMarkIcon className="w-4 h-4 text-gray-500 hover:text-gray-700" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <BellIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Belum ada notifikasi
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Notifikasi akan muncul di sini ketika ada aktivitas baru
              </p>
            </div>
          ) : (
            <div className="p-3">
              {notifications.slice(0, 5).map((notification, index) => (
                <div
                  key={notification.id}
                  className={`group relative rounded-lg transition-all duration-200 hover:shadow-sm ${
                    getNotificationBgColor(notification.type, notification.isRead)
                  } ${index > 0 ? 'mt-2' : ''} ${
                    hasSubmissionData(notification) ? 'cursor-pointer hover:scale-[1.01]' : ''
                  }`}
                  onClick={() => {
                    if (hasSubmissionData(notification)) {
                      handleViewDetail(notification);
                    }
                  }}
                >
                  <div className="p-3">
                    <div className="flex items-start space-x-3">
                      {/* Icon with status */}
                      <div className="flex-shrink-0 relative">
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm">
                          {getNotificationIcon(notification.type)}
                        </div>
                        {!notification.isRead && (
                          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800"></div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-1">
                            {/* Type Badge */}
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                {getNotificationTypeLabel(notification.type)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                            </div>
                            
                            {/* Title */}
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                              {notification.title}
                            </h4>
                            
                            {/* Message */}
                            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                              {notification.message}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-600">
                          <div className="flex items-center space-x-2">
                            {hasSubmissionData(notification) && (
                              <button className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium group-hover:underline">
                                {loadingSubmissionId === notification.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent mr-1"></div>
                                    Memuat...
                                  </>
                                ) : (
                                  <>
                                    <EyeIcon className="w-3 h-3 mr-1" />
                                    Lihat Detail
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="inline-flex items-center text-xs text-gray-500 hover:text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <CheckIcon className="w-3 h-3 mr-1" />
                              Tandai dibaca
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Menampilkan {Math.min(notifications.length, 5)} dari {notifications.length} notifikasi
              </span>
              {notifications.length > 5 && (
                <a
                  href="/dashboard/notifications"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                >
                  Lihat semua notifikasi
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail Submission */}
      {selectedSubmission && (
        <>
          {session?.user?.role === 'ADMIN' ? (
            <AdminSubmissionDetailModal
              submission={selectedSubmission}
              isOpen={isDetailModalOpen}
              onClose={handleCloseDetailModal}
              onSubmissionUpdate={(updatedSubmission) => {
                setSelectedSubmission(updatedSubmission);
              }}
            />
          ) : (
            <SubmissionDetailModal
              submission={selectedSubmission}
              isOpen={isDetailModalOpen}
              onClose={handleCloseDetailModal}
            />
          )}
        </>
      )}
    </>
  );
}
