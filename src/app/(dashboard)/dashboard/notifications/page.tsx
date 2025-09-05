'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import RoleGate from '@/components/security/RoleGate';
import { 
  BellIcon, 
  CheckIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  UserPlusIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import AdminSubmissionDetailModal from '@/components/admin/AdminSubmissionDetailModal';
import SubmissionDetailModal from '@/components/vendor/SubmissionDetailModal';

// Interface untuk notification
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  scope: string;
  vendorId?: string;
}

// Interface untuk submission (dari AdminSubmissionDetailModal)
interface Submission {
  id: string;
  approval_status: string;
  vendor_name: string;
  based_on: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation: string | null;
  working_hours: string;
  other_notes?: string;
  work_facilities: string;
  simja_number?: string;
  simja_date?: string | null;
  sika_number?: string;
  sika_date?: string | null;
  simlok_number?: string;
  simlok_date?: string | null;
  worker_names: string;
  content: string;
  notes?: string;
  implementation_notes?: string;
  sika_document_upload?: string;
  simja_document_upload?: string;
  qrcode?: string;
  created_at: string;
  signer_position?: string;
  signer_name?: string;
  user: {
    id: string;
    officer_name: string;
    email: string;
    vendor_name: string;
  };
  approved_by_user?: {
    id: string;
    officer_name: string;
    email: string;
  };
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loadingSubmissionId, setLoadingSubmissionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch notifications based on user role
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!session?.user?.id) return;
      
      setLoading(true);
      try {
        const scope = session.user.role === 'ADMIN' ? 'admin' : 'vendor';
        const response = await fetch(`/api/notifications?scope=${scope}&limit=50`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📋 Notifications API response:', data);
          console.log('📅 First notification createdAt:', data.notifications?.[0]?.createdAt);
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchNotifications();
    }
  }, [session?.user?.id, session?.user?.role, status]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notification => 
          notification.id === notificationId ? { ...notification, isRead: true } : notification
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

    const formatTimeAgo = (dateString: string): string => {
    if (!dateString) {
      return 'Tidak diketahui';
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Tanggal tidak valid';
    }

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
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} hari yang lalu`;
    } else {
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'submission_approved':
        return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
      case 'submission_rejected':
        return <XMarkIcon className={`${iconClass} text-red-600`} />;
      case 'submission_pending':
        return <ClockIcon className={`${iconClass} text-amber-600`} />;
      case 'new_submission':
        return <DocumentTextIcon className={`${iconClass} text-blue-600`} />;
      case 'user_registered':
        return <UserPlusIcon className={`${iconClass} text-purple-600`} />;
      default:
        return <BellIcon className={`${iconClass} text-gray-600`} />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'submission_approved':
        return 'Disetujui';
      case 'submission_rejected':
        return 'Ditolak';
      case 'submission_pending':
        return 'Menunggu';
      case 'new_submission':
        return 'Pengajuan Baru';
      case 'user_registered':
        return 'User Baru';
      default:
        return 'Notifikasi';
    }
  };

  const getNotificationBgColor = (type: string, isRead: boolean) => {
    if (isRead) {
      return 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700';
    }

    switch (type) {
      case 'submission_approved':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 border-l-4 border-l-green-500';
      case 'submission_rejected':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 border-l-4 border-l-red-500';
      case 'submission_pending':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 border-l-4 border-l-amber-500';
      case 'new_submission':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 border-l-4 border-l-blue-500';
      case 'user_registered':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 border-l-4 border-l-purple-500';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-l-4 border-l-gray-500';
    }
  };

  const hasSubmissionData = (notification: Notification) => {
    // Cek berdasarkan type notification
    const submissionTypes = [
      'submission_approved', 
      'submission_rejected', 
      'submission_pending',
      'new_submission',
      'status_change'
    ];
    
    if (submissionTypes.includes(notification.type)) {
      return true;
    }
    
    // Cek di dalam data
    if (notification.data) {
      let parsedData;
      if (typeof notification.data === 'string') {
        try {
          parsedData = JSON.parse(notification.data);
        } catch {
          return notification.data.includes('submissionId');
        }
      } else {
        parsedData = notification.data;
      }
      
      if (parsedData && parsedData.submissionId) {
        return true;
      }
    }
    
    // Cek di message atau title
    const submissionKeywords = ['pengajuan', 'submission', 'simlok'];
    const text = `${notification.title} ${notification.message}`.toLowerCase();
    
    return submissionKeywords.some(keyword => text.includes(keyword));
  };

  const handleViewDetail = async (notification: Notification) => {
    console.log('🔍 handleViewDetail called with notification:', notification);
    
    if (!hasSubmissionData(notification)) {
      console.log('❌ No submission data found');
      return;
    }

    setLoadingSubmissionId(notification.id);
    
    try {
      // Mark as read when viewing
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }

      // Extract submission ID from notification data
      let submissionId = '';
      
      console.log('📋 Processing notification.data:', notification.data);
      
      // Parse dari data JSON jika ada
      if (notification.data) {
        let parsedData;
        if (typeof notification.data === 'string') {
          try {
            parsedData = JSON.parse(notification.data);
            console.log('✅ Parsed data:', parsedData);
          } catch {
            // Jika tidak bisa parse JSON, coba extract dari string
            const match = notification.data.match(/submissionId[:\s]*([a-zA-Z0-9_-]+)/);
            if (match && match[1]) submissionId = match[1];
            console.log('🔤 String match result:', match);
          }
        } else {
          parsedData = notification.data;
          console.log('📊 Direct data:', parsedData);
        }
        
        if (parsedData && parsedData.submissionId) {
          submissionId = parsedData.submissionId;
          console.log('🎯 Found submissionId in parsedData:', submissionId);
        }
      }
      
      // Jika belum ketemu, coba extract dari message atau title
      if (!submissionId) {
        console.log('🔍 Trying to extract from message/title...');
        const patterns = [
          /ID[:\s]*([a-zA-Z0-9_-]+)/,
          /submission[:\s]*([a-zA-Z0-9_-]+)/i,
          /pengajuan[:\s]*([a-zA-Z0-9_-]+)/i,
          /([a-zA-Z0-9_-]{20,})/  // Pattern untuk ID yang panjang
        ];
        
        for (const pattern of patterns) {
          const messageMatch = notification.message.match(pattern);
          const titleMatch = notification.title.match(pattern);
          
          console.log(`🔎 Pattern ${pattern} - Message match:`, messageMatch, 'Title match:', titleMatch);
          
          if (messageMatch && messageMatch[1]) {
            submissionId = messageMatch[1];
            console.log('✅ Found in message:', submissionId);
            break;
          }
          if (titleMatch && titleMatch[1]) {
            submissionId = titleMatch[1];
            console.log('✅ Found in title:', submissionId);
            break;
          }
        }
      }

      console.log('🔑 Final submission ID:', submissionId);

      if (submissionId) {
        console.log('🌐 Fetching submission details...');
        // Fetch submission details
        const response = await fetch(`/api/submissions/${submissionId}`);
        if (response.ok) {
          const submission = await response.json();
          console.log('✅ Submission loaded:', submission);
          setSelectedSubmission(submission);
        } else {
          console.error('❌ Failed to fetch submission:', response.statusText);
          alert('Gagal memuat detail submission');
        }
      } else {
        console.warn('⚠️ No submission ID found in notification');
        alert('ID submission tidak ditemukan dalam notifikasi ini');
      }
    } catch (error) {
      console.error('💥 Error handling notification detail:', error);
      alert('Terjadi kesalahan saat memuat detail');
    } finally {
      setLoadingSubmissionId(null);
    }
  };

  // Filter notifications
  const filteredNotifications = notifications
    .filter((notification: Notification) => {
      if (filter === 'unread') return !notification.isRead;
      if (filter === 'read') return notification.isRead;
      return true;
    })
    .filter((notification: Notification) => {
      if (!searchTerm) return true;
      return notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    });

  if (status === 'loading') {
    return (
      <SidebarLayout title="Notifikasi" titlePage="Memuat...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <RoleGate allowedRoles={["ADMIN", "VENDOR"]}>
      <SidebarLayout title="Notifikasi" titlePage="Semua Notifikasi">
        <div className="space-y-6">
          {/* Header Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <BellIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {session?.user?.role === 'ADMIN' ? 'Notifikasi Admin' : 'Notifikasi Vendor'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {loading ? 'Memuat...' : unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
                  </p>
                </div>
              </div>
              
              {unreadCount > 0 && !loading && (
                <Button
                  onClick={markAllAsRead}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>Tandai Semua Dibaca</span>
                </Button>
              )}
            </div>
          </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari notifikasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-4 h-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua ({notifications.length})</option>
                <option value="unread">Belum Dibaca ({unreadCount})</option>
                <option value="read">Sudah Dibaca ({notifications.length - unreadCount})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <BellIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'Tidak ada hasil' : 'Belum ada notifikasi'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm 
                  ? `Tidak ditemukan notifikasi yang cocok dengan "${searchTerm}"`
                  : 'Notifikasi akan muncul di sini ketika ada aktivitas baru'
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md ${
                  getNotificationBgColor(notification.type, notification.isRead)
                } ${hasSubmissionData(notification) ? 'cursor-pointer hover:scale-[1.002]' : ''}`}
                onClick={() => {
                  if (hasSubmissionData(notification)) {
                    handleViewDetail(notification);
                  }
                }}
              >
                <div className="p-4">
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 relative">
                      <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-600">
                        {getNotificationIcon(notification.type)}
                      </div>
                      {!notification.isRead && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          {/* Type and Time */}
                          <div className="flex items-center space-x-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              {getNotificationTypeLabel(notification.type)}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                          
                          {/* Title */}
                          <h3 className="text-base font-medium text-gray-900 dark:text-white leading-snug">
                            {notification.title}
                          </h3>
                          
                          {/* Message */}
                          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            {notification.message}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-600">
                        <div className="flex items-center space-x-3">
                          {hasSubmissionData(notification) && (
                            <button 
                              onClick={() => handleViewDetail(notification)}
                              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                              disabled={loadingSubmissionId === notification.id}
                            >
                              {loadingSubmissionId === notification.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                                  Memuat...
                                </>
                              ) : (
                                <>
                                  <EyeIcon className="w-4 h-4 mr-2" />
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
                            className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 font-medium px-3 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            <CheckIcon className="w-4 h-4 mr-1" />
                            Tandai dibaca
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {filteredNotifications.length > 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan {filteredNotifications.length} dari {notifications.length} notifikasi
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedSubmission && session?.user?.role === 'ADMIN' && (
        <AdminSubmissionDetailModal
          submission={selectedSubmission}
          isOpen={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}

      {selectedSubmission && session?.user?.role === 'VENDOR' && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          isOpen={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
      </SidebarLayout>
    </RoleGate>
  );
}
