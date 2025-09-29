'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/useToast';
import SidebarLayout from '@/components/layout/SidebarLayout';
import RoleGate from '@/components/security/RoleGate';
import { 
  BellIcon, 
  CheckIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentPlusIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  InboxIcon,
  XMarkIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import AdminSubmissionDetailModal from '@/components/admin/AdminSubmissionDetailModal';
import PageLoader from '@/components/ui/PageLoader';
import SubmissionDetailModal from '@/components/vendor/SubmissionDetailModal';
import UserVerificationModal from '@/components/admin/UserVerificationModal';
import { UserData } from '@/types/user';

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
  const { showError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedVendorUser, setSelectedVendorUser] = useState<UserData | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch notifications based on user role
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!session?.user?.id) return;
      
      setLoading(true);
      try {
        const scope = session.user.role === 'ADMIN' ? 'admin' : 'vendor';
        const response = await fetch(`/api/v1/notifications?scope=${scope}&limit=50`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📋 Notifications API v1 response:', data);
          console.log('📅 First notification createdAt:', data.data?.data?.[0]?.createdAt);
          // API v1 returns nested structure: {success: true, data: {data: [...], pagination: {...}}}
          setNotifications(data.data?.data || []);
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

  // Safely calculate unread count
  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const scope = session?.user?.role === 'ADMIN' ? 'admin' : 'vendor';
      const response = await fetch('/api/v1/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scope }),
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
      case 'status_change':
        return <ShieldCheckIcon className={`${iconClass} text-blue-600`} />;
      case 'new_submission':
        return <DocumentPlusIcon className={`${iconClass} text-blue-600`} />;
      case 'new_vendor':
        return <UserPlusIcon className={`${iconClass} text-blue-600`} />;
      case 'vendor_verified':
        return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
      case 'user_registered':
        return <UserPlusIcon className={`${iconClass} text-blue-600`} />;
      default:
        return <BellIcon className={`${iconClass} text-gray-600`} />;
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

  const hasVendorData = (notification: Notification) => {
    console.log('🔍 Checking hasVendorData for:', notification);
    
    // Cek berdasarkan type notification
    const vendorTypes = [
      'new_vendor',
      'vendor_verified',
      'vendor_registered'
    ];
    
    if (vendorTypes.includes(notification.type)) {
      console.log('✅ Found vendor type:', notification.type);
      return true;
    }
    
    // Cek di dalam data
    if (notification.data) {
      let parsedData;
      if (typeof notification.data === 'string') {
        try {
          parsedData = JSON.parse(notification.data);
          console.log('📊 Parsed vendor data:', parsedData);
        } catch {
          const hasVendorId = notification.data.includes('vendorId');
          console.log('🔤 String contains vendorId:', hasVendorId);
          return hasVendorId;
        }
      } else {
        parsedData = notification.data;
        console.log('📊 Direct vendor data:', parsedData);
      }
      
      if (parsedData && parsedData.vendorId) {
        console.log('🎯 Found vendorId in data:', parsedData.vendorId);
        return true;
      }
    }
    
    // Cek di message atau title
    const vendorKeywords = ['vendor', 'perusahaan', 'pendaftaran vendor'];
    const text = `${notification.title} ${notification.message}`.toLowerCase();
    const hasKeyword = vendorKeywords.some(keyword => text.includes(keyword));
    
    console.log('🔍 Text search result:', hasKeyword, 'for text:', text);
    
    return hasKeyword;
  };

  const handleViewDetail = async (notification: Notification) => {
    console.log('🔍 handleViewDetail called with notification:', notification);
    console.log('🔍 notification.type:', notification.type);
    console.log('🔍 notification.data:', notification.data);
    
    // Mark as read when viewing
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Check if it's a vendor notification
    const isVendorNotification = hasVendorData(notification);
    console.log('👤 Is vendor notification:', isVendorNotification);
    
    if (isVendorNotification) {
      console.log('📋 Processing vendor notification.data:', notification.data);
      
      let vendorId = '';
      
      // Parse vendor ID from notification data
      if (notification.data) {
        let parsedData;
        if (typeof notification.data === 'string') {
          try {
            parsedData = JSON.parse(notification.data);
            console.log('✅ Parsed vendor data:', parsedData);
          } catch {
            // Jika tidak bisa parse JSON, coba extract dari string
            const match = notification.data.match(/vendorId[:\s]*([a-zA-Z0-9_-]+)/);
            if (match && match[1]) vendorId = match[1];
            console.log('🔤 String match result for vendor:', match);
          }
        } else {
          parsedData = notification.data;
          console.log('📊 Direct vendor data:', parsedData);
        }
        
        if (parsedData && parsedData.vendorId) {
          vendorId = parsedData.vendorId;
          console.log('🎯 Found vendorId in parsedData:', vendorId);
        }
      }

      if (vendorId) {
        // Fetch vendor user data
        try {
          const response = await fetch(`/api/admin/users/${vendorId}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch vendor details');
          }
          
          const data = await response.json();
          console.log('✅ Vendor user data fetched:', data);
          
          setSelectedVendorUser(data.user);
          
          console.log('🚀 Opening user verification modal for vendorId:', vendorId);
        } catch (err) {
          console.error('❌ Error fetching vendor details:', err);
          showError('Error', 'Gagal memuat detail vendor');
        }
      } else {
        console.warn('⚠️ No vendor ID found in notification');
      }
      return;
    }

    // Handle submission notifications
    if (!hasSubmissionData(notification)) {
      console.log('❌ No submission data found');
      return;
    }
    
    try {
      // Extract submission ID from notification data
      let submissionId = '';
      
      console.log('📋 Processing submission notification.data:', notification.data);
      
      // Parse dari data JSON jika ada
      if (notification.data) {
        let parsedData;
        if (typeof notification.data === 'string') {
          try {
            parsedData = JSON.parse(notification.data);
            console.log('✅ Parsed submission data:', parsedData);
          } catch {
            // Jika tidak bisa parse JSON, coba extract dari string
            const match = notification.data.match(/submissionId[:\s]*([a-zA-Z0-9_-]+)/);
            if (match && match[1]) submissionId = match[1];
            console.log('🔤 String match result for submission:', match);
          }
        } else {
          parsedData = notification.data;
          console.log('📊 Direct submission data:', parsedData);
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
          showError('Error', 'Gagal memuat detail submission');
        }
      } else {
        console.warn('⚠️ No submission ID found in notification');
        showError('Error', 'ID submission tidak ditemukan dalam notifikasi ini');
      }
    } catch (error) {
      console.error('💥 Error handling notification detail:', error);
      showError('Error', 'Terjadi kesalahan saat memuat detail');
    }
  };

  // Add truncate function
  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Handle vendor user updates
  const handleUserUpdate = (updatedUser: UserData) => {
    setSelectedVendorUser(updatedUser);
  };

  // Handle vendor user removal
  const handleUserRemove = () => {
    setSelectedVendorUser(null);
  };

  // Filter notifications
  const filteredNotifications = Array.isArray(notifications) ? notifications
    .filter((notification: Notification) => {
      if (filter === 'unread') return !notification.isRead;
      if (filter === 'read') return notification.isRead;
      return true;
    })
    .filter((notification: Notification) => {
      if (!searchTerm) return true;
      return notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    }) : [];

  if (status === 'loading') {
    return (
      <SidebarLayout title="Notifikasi" titlePage="Memuat...">
        <div className="max-w-5xl mx-auto px-3 md:px-6">
          <PageLoader message="Memuat notifikasi..." fullScreen={false} />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <RoleGate allowedRoles={["ADMIN", "VENDOR"]}>
      <SidebarLayout title="Notifikasi" titlePage="Semua Notifikasi">
        <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 px-3 md:px-6">
          
          {/* Header */}
          <div className="flex items-center justify-between rounded-xl border bg-white p-3 md:p-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <BellIcon className="w-5 h-5 text-blue-600" />
                </div>
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-semibold px-1.5">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-base md:text-lg font-semibold text-gray-900">
                  {session?.user?.role === 'ADMIN' ? 'Notifikasi' : 'Notifikasi'}
                </h1>
                <p className="text-sm text-gray-500">
                  {loading ? 'Memuat...' : unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
                </p>
              </div>
            </div>
            
            {unreadCount > 0 && !loading && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                aria-label="Tandai semua notifikasi sebagai dibaca"
              >
                <CheckIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Tandai semua dibaca</span>
                <span className="sm:hidden">Tandai semua</span>
              </Button>
            )}
          </div>

          {/* Toolbar */}
          <div className="rounded-xl border bg-white p-3 md:p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search */}
              <div className="md:col-span-7">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari notifikasi…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder:text-gray-500"
                    aria-label="Cari notifikasi"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="md:col-span-5 flex gap-2 md:justify-end">
                {/* Read State Filter */}
                <div className="flex rounded-lg border border-gray-300 bg-white p-1">
                  {(['all', 'unread', 'read'] as const).map((filterOption) => (
                    <button
                      key={filterOption}
                      onClick={() => setFilter(filterOption)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        filter === filterOption
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900:text-gray-200'
                      }`}
                    >
                      {filterOption === 'all' && 'Semua'}
                      {filterOption === 'unread' && 'Belum Dibaca'}
                      {filterOption === 'read' && 'Sudah Dibaca'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <InboxIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'Tidak ada hasil' : 'Tidak ada notifikasi'}
                </h3>
                <p className="text-sm text-gray-500 text-center max-w-sm">
                  {searchTerm 
                    ? `Tidak ditemukan notifikasi yang cocok dengan "${searchTerm}"`
                    : 'Anda akan melihat notifikasi baru di sini ketika ada aktivitas'
                  }
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => window.location.href = '/dashboard'}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Kembali ke Dashboard
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification: any) => {
                  const isUnread = !notification.isRead;
                  const fullTimestamp = new Date(notification.createdAt).toLocaleString('id-ID');
                  
                  return (
                    <div
                      key={notification.id}
                      className={`relative flex items-start gap-3 p-3 md:p-4 transition-all duration-200 hover:bg-gray-50:bg-gray-800/50 focus-within:ring-2 focus-within:ring-blue-500/30 ${
                        isUnread 
                          ? 'bg-blue-50/50 border-l-2 border-blue-500/50' 
                          : ''
                      } ${
                        hasSubmissionData(notification) || hasVendorData(notification) ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => {
                        console.log('🖱️ Notification clicked:', notification);
                        console.log('📋 hasSubmissionData:', hasSubmissionData(notification));
                        console.log('👤 hasVendorData:', hasVendorData(notification));
                        
                        if (hasSubmissionData(notification) || hasVendorData(notification)) {
                          handleViewDetail(notification);
                        } else {
                          console.log('❌ No action taken - neither submission nor vendor data found');
                        }
                      }}
                      role="listitem"
                    >
                      {/* Unread indicator dot */}
                      {isUnread && (
                        <div className="absolute left-2 top-2.5 h-2 w-2 rounded-full bg-blue-600"></div>
                      )}

                      {/* Icon */}
                      <div className="shrink-0 h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center ml-2">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 
                              className={`text-sm md:text-base leading-tight ${
                                isUnread 
                                  ? 'font-semibold text-gray-900' 
                                  : 'font-medium text-gray-800'
                              }`}
                              style={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {truncateText(notification.title, 80)}
                            </h3>
                            <p 
                              className="mt-0.5 text-xs md:text-sm text-gray-600 leading-relaxed"
                              style={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {truncateText(notification.message, 120)}
                            </p>
                          </div>
                          
                          <span 
                            className="text-[11px] md:text-xs text-gray-500 whitespace-nowrap ml-3"
                            title={fullTimestamp}
                          >
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>

                        {/* Actions */}
                        {(hasSubmissionData(notification) || hasVendorData(notification)) && (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <button className="inline-flex items-center text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors">
                              {hasVendorData(notification) ? 'Lihat detail' : 'Lihat detail'}
                              <ArrowRightIcon className="w-3 h-3 ml-1" />
                            </button>
                            
                            {isUnread && (
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  await markAsRead(notification.id);
                                }}
                                className="inline-flex items-center text-xs text-gray-500 hover:text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50:bg-blue-900/20 transition-colors"
                                aria-label="Tandai sebagai dibaca"
                              >
                                <CheckIcon className="w-3 h-3" />
                                <span className="ml-1 hidden sm:inline">Tandai dibaca</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            {filteredNotifications.length > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-500 p-3 border-t border-gray-100 bg-gray-50/50">
                <span>
                  Menampilkan {filteredNotifications.length} dari {Array.isArray(notifications) ? notifications.length : 0} notifikasi
                </span>
                {/* Future: Load more functionality */}
              </div>
            )}
          </div>
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

      {/* User Verification Modal */}
      {selectedVendorUser && (
        <UserVerificationModal
          isOpen={!!selectedVendorUser}
          onClose={() => setSelectedVendorUser(null)}
          user={selectedVendorUser}
          onUserUpdate={handleUserUpdate}
          onUserRemove={handleUserRemove}
        />
      )}
      </SidebarLayout>
    </RoleGate>
  );
}
