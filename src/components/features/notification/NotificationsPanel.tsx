// src/components/notifications/NotificationsPanel.tsx
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  BellIcon,
  XMarkIcon,
  XCircleIcon,
  CheckIcon,
  CheckCircleIcon,
  ClockIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  ShieldCheckIcon,
  InboxIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import SubmissionDetailModal from '@/components/features/submission/modal/VendorSubmissionDetailModal';
import ApproverSubmissionDetailModal from '@/components/features/submission/modal/ApproverSubmissionDetailModal';
import ReviewerSubmissionDetailModal from '@/components/features/submission/modal/ReviewerSubmissionDetailModal';
import UserVerificationModal from '@/components/features/user/modal/UserVerificationModal';
import { UserData } from '@/types';
import { useToast } from '@/hooks/useToast';

import { useNotificationsStore, type Notification } from '@/store/notifications';

interface NotificationsPanelProps {
  onClose: () => void;
}

export default function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { data: session } = useSession();
  const {
    items: notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    reload
  } = useNotificationsStore();
  const { showError, showWarning } = useToast();

  // Helper scope & vendorId dari session
  const getScopeAndVendor = () => {
    if (!session?.user) return { scope: 'vendor' as const, vendorId: undefined as string | undefined };
    const role = session.user.role;
    if (role === 'SUPER_ADMIN') return { scope: 'admin' as const, vendorId: undefined };
    if (role === 'APPROVER')    return { scope: 'approver' as const, vendorId: undefined };
    if (role === 'REVIEWER')    return { scope: 'reviewer' as const, vendorId: undefined };
    // VENDOR
    return { scope: 'vendor' as const, vendorId: session.user.id };
  };

  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // State for vendor verification modal
  const [selectedVendorUser, setSelectedVendorUser] = useState<UserData | null>(null);

  // Reload notifications when panel is opened to ensure fresh data
  useEffect(() => {
    const { scope, vendorId } = getScopeAndVendor();
    console.log('NotificationsPanel - Reloading fresh data on open:', { scope, vendorId });
    reload({
      scope,
      vendorId,
      filter: 'all', // Always load ALL notifications (read and unread)
      pageSize: 50
    }).then(() => {
      console.log('NotificationsPanel - Fresh data loaded successfully');
    }).catch((error) => {
      console.error('Failed to reload notifications:', error);
    });
  }, []); // Run once when panel opens

  // Close panel on ESC & lock scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
      // Redirect to edit form for submission_needs_revision
      if (notification.type === 'submission_needs_revision') {
        let submissionId: string | null = null;
        if (notification.data) {
          try {
            const parsed = typeof notification.data === 'string'
              ? JSON.parse(notification.data)
              : notification.data;
            submissionId = parsed.submissionId || parsed.submission_id || null;
          } catch {}
        }
        if (submissionId) {
          window.location.href = `/vendor/submissions/edit/${submissionId}`;
          if (!notification.isRead) {
            try {
              const { scope, vendorId } = getScopeAndVendor();
              await markAsRead(notification.id, { scope, vendorId });
            } catch {}
          }
        }
        return;
      }

      // Vendor detail types
      if (
        notification.type === 'user_registered' ||
        notification.type === 'new_vendor' ||
        notification.type === 'new_user_verification'
      ) {
        await handleVendorDetail(notification);
        return;
      }

      // Redirect to edit form for submission_needs_revision
      if (notification.type === 'submission_needs_revision') {
        let submissionId: string | null = null;
        if (notification.data) {
          try {
            const parsed = typeof notification.data === 'string'
              ? JSON.parse(notification.data)
              : notification.data;
            submissionId = parsed.submissionId || parsed.submission_id || null;
          } catch {}
        }
        if (submissionId) {
          window.location.href = `/vendor/submissions/edit/${submissionId}`;
          if (!notification.isRead) {
            try {
              const { scope, vendorId } = getScopeAndVendor();
              await markAsRead(notification.id, { scope, vendorId });
            } catch {}
          }
        }
        return;
      }

      // Extract submissionId
      let submissionId: string | null = null;
      if (notification.data) {
        try {
          const parsed = typeof notification.data === 'string'
            ? JSON.parse(notification.data)
            : notification.data;
          submissionId = parsed.submissionId || parsed.submission_id || null;
        } catch {
          // ignore
        }
      }
      if (!submissionId) {
        const idPattern = /ID[:\s]+([a-zA-Z0-9]+)/i;
        submissionId =
          notification.message.match(idPattern)?.[1] ||
          notification.title.match(idPattern)?.[1] ||
          null;
      }
      if (!submissionId) return;

      // Use universal submissions endpoint for all roles
      const apiEndpoint = `/api/submissions/${submissionId}`;

      const response = await fetch(apiEndpoint);
      if (response.status === 404) {
        showWarning('Pengajuan Tidak Ditemukan', 'Pengajuan pada notifikasi ini sudah tidak tersedia atau dihapus.');
        if (!notification.isRead) {
          try {
            const { scope, vendorId } = getScopeAndVendor();
            await markAsRead(notification.id, { scope, vendorId });
          } catch {}
        }
        return;
      }
      if (!response.ok) throw new Error(`Failed to fetch submission details: ${response.status}`);
      const payload = await response.json();
      const submissionData = payload.submission || payload;

      setSelectedSubmission(submissionData);
      setSelectedSubmissionId(submissionId);
      setIsDetailModalOpen(true);

      if (!notification.isRead) {
        try {
          const { scope, vendorId } = getScopeAndVendor();
          await markAsRead(notification.id, { scope, vendorId });
        } catch {}
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        showWarning('Pengajuan Tidak Ditemukan', 'Pengajuan pada notifikasi ini sudah tidak tersedia atau dihapus.');
      } else {
        showError('Gagal Memuat Detail', 'Terjadi kesalahan saat memuat detail pengajuan. Silakan coba lagi.');
      }
    }
  };

  const handleVendorDetail = async (notification: Notification) => {
    try {
      let vendorId: string | null = null;
      if (notification.data) {
        try {
          const parsed = typeof notification.data === 'string'
            ? JSON.parse(notification.data)
            : notification.data;
          vendorId = parsed.vendorId || parsed.userId || parsed.user_id || null;
        } catch {}
      }
      if (!vendorId) return;

      if (session?.user?.role === 'REVIEWER') {
        const response = await fetch(`/api/users/${vendorId}`);
        if (response.status === 404) {
          showWarning('Data Vendor Tidak Ditemukan', 'Data vendor pada notifikasi ini sudah tidak tersedia.');
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setSelectedVendorUser(data.user);
      } else {
        showWarning('Info', 'Fitur detail vendor tidak tersedia untuk role ini.');
      }

      if (!notification.isRead) {
        try {
          const { scope, vendorId: vId } = getScopeAndVendor();
          await markAsRead(notification.id, { scope, vendorId: vId });
        } catch {}
      }
    } catch (err) {
      showError('Gagal Memuat Detail Vendor', 'Gagal memuat detail vendor. Silakan coba lagi.');
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSubmission(null);
    setSelectedSubmissionId(null);
  };

  const handleSubmissionUpdated = () => {
    // Kirim custom event untuk refresh dashboard sesuai role
    if (session?.user?.role === 'APPROVER') {
      console.log('🔄 Triggering approver dashboard refresh from notification panel');
      window.dispatchEvent(new CustomEvent('approver-dashboard-refresh'));
    } else if (session?.user?.role === 'REVIEWER') {
      console.log('🔄 Triggering reviewer dashboard refresh from notification panel');
      window.dispatchEvent(new CustomEvent('reviewer-dashboard-refresh'));
    }
    
    handleCloseDetailModal();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}h`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = 'w-5 h-5';
    switch (type) {
      // ✅ Approved - Green
      case 'submission_approved':
        return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
      
      // ⚠️ Needs Revision - Orange
      case 'submission_needs_revision':
        return <XCircleIcon className={`${iconClass} text-orange-600`} />;
      
      // 🔄 Resubmitted - Blue
      case 'submission_resubmitted':
        return <ClockIcon className={`${iconClass} text-blue-600`} />;
      
      // ❌ Rejected - Red
      case 'submission_rejected':
        return <XCircleIcon className={`${iconClass} text-red-600`} />;
      
      // ⏱️ Pending/Review - Amber
      case 'submission_pending':
      case 'new_submission_review':
        return <ClockIcon className={`${iconClass} text-amber-600`} />;
      
      // ✓ Needs Approval - Blue Shield
      case 'reviewed_submission_approval':
        return <ShieldCheckIcon className={`${iconClass} text-blue-600`} />;
      
      // 📄 New Submission - Blue Document
      case 'new_submission':
        return <DocumentPlusIcon className={`${iconClass} text-blue-600`} />;
      
      // 🔄 Status Change - Blue Shield
      case 'status_change':
        return <ShieldCheckIcon className={`${iconClass} text-blue-600`} />;
      
      // 👤 User/Vendor - Blue User
      case 'user_registered':
      case 'new_vendor':
      case 'new_user_verification':
        return <UserPlusIcon className={`${iconClass} text-blue-600`} />;
      
      // 🔔 Default - Gray Bell
      default:
        return <BellIcon className={`${iconClass} text-gray-500`} />;
    }
  };

  const truncateText = (text: string, maxLength = 80) =>
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  const getEnhancedMessage = (notification: Notification) => {
    const { type, message, title } = notification;
    switch (type) {
      case 'submission_approved':
        return {
          title: 'Pengajuan Disetujui',
          message: truncateText('Selamat! Pengajuan Simlok Anda telah disetujui dan dapat digunakan.'),
          action: 'Lihat detail'
        };
      
      case 'submission_rejected':
        return {
          title: 'Pengajuan Ditolak',
          message: truncateText('Pengajuan Simlok Anda ditolak. Silakan periksa catatan dan lakukan perbaikan.'),
          action: 'Lihat detail'
        };
      
      case 'submission_pending':
      case 'new_submission_review':
        return {
          title: 'Pengajuan Perlu Review',
          message: truncateText('Pengajuan Simlok sedang dalam proses review.'),
          action: 'Lihat detail'
        };
      
      case 'reviewed_submission_approval':
        return {
          title: 'Pengajuan Perlu Persetujuan',
          message: truncateText('Pengajuan Simlok sudah direview dan perlu persetujuan final.'),
          action: 'Lihat detail'
        };
      
      case 'status_change': {
        let enhancedTitle = title;
        let enhancedMessage = message;
        if (title.includes('Disetujui')) {
          enhancedTitle = 'Pengajuan Disetujui';
          enhancedMessage = 'Selamat! Pengajuan Simlok Anda telah disetujui dan dapat digunakan.';
        } else if (title.includes('Ditolak')) {
          enhancedTitle = 'Pengajuan Ditolak';
          enhancedMessage = 'Pengajuan Simlok Anda ditolak. Silakan periksa catatan dan lakukan perbaikan.';
        }
        return {
          title: truncateText(enhancedTitle, 50),
          message: truncateText(enhancedMessage),
          action: 'Lihat detail'
        };
      }
      
      case 'new_submission':
        return {
          title: 'Pengajuan Baru Masuk',
          message: truncateText(message.replace('Pengajuan baru dari', 'Pengajuan Simlok baru dari')),
          action: 'Lihat detail'
        };
      
      case 'user_registered':
      case 'new_vendor':
      case 'new_user_verification':
        return {
          title: 'User Baru Perlu Verifikasi',
          message: truncateText(message.replace('User baru terdaftar', 'User baru mendaftar dan perlu verifikasi')),
          action: 'Lihat detail'
        };
      
      case 'submission_needs_revision':
        return {
          title: 'Pengajuan Perlu Diperbaiki',
          message: truncateText('Pengajuan Simlok Anda perlu diperbaiki. Silakan periksa catatan reviewer dan perbaiki pengajuan Anda.'),
          action: 'Edit pengajuan',
          redirectToEdit: true
        };
      
      case 'submission_resubmitted':
        return {
          title: 'Pengajuan Dikirim Ulang',
          message: truncateText('Vendor telah memperbaiki dan mengirim ulang pengajuan. Silakan review kembali.'),
          action: 'Review ulang'
        };
      
      default:
        return {
          title: truncateText(title, 50),
          message: truncateText(message),
          action: 'Lihat detail'
        };
    }
  };

  const hasSubmissionData = (notification: Notification) => {
    if (
      notification.type === 'user_registered' ||
      notification.type === 'new_vendor' ||
      notification.type === 'new_user_verification'
    ) {
      return true;
    }
    // All submission-related notifications can be clicked
    const hasSubmissionType = notification.type.includes('submission') || notification.type === 'status_change';
    let hasSubmissionId = false;
    if (notification.data) {
      if (typeof notification.data === 'string') {
        hasSubmissionId = notification.data.includes('submissionId');
      } else if (typeof notification.data === 'object') {
        hasSubmissionId =
          (notification.data as any).submissionId || (notification.data as any).submission_id;
      }
    }
    const hasIdInMessage = notification.message.includes('ID');
    const hasIdInTitle = notification.title.includes('ID');
    return hasSubmissionType || hasSubmissionId || hasIdInMessage || hasIdInTitle;
  };

  if (!notifications) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Floating Panel */}
      <div
        className="absolute right-0 top-12 w-[90vw] md:w-[420px] bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[70vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-label="Panel notifikasi"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0 bg-gray-50/50">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <BellIcon className="w-5 h-5 text-gray-700" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-semibold">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Notifikasi</h3>
              {unreadCount > 0 && <p className="text-xs text-gray-500">{unreadCount} belum dibaca</p>}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                onClick={async () => {
                  try {
                    const { scope, vendorId } = getScopeAndVendor();
                    await markAllAsRead({ scope, vendorId });
                  } catch (error) {
                    console.error('Error marking all notifications as read:', error);
                  }
                }}
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
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Tutup panel"
            >
              <XMarkIcon className="w-4 h-4 text-gray-500 hover:text-gray-700" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" role="list" aria-label="Daftar notifikasi">
          {!notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <InboxIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Tidak ada notifikasi</h4>
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                Anda akan melihat notifikasi baru di sini ketika ada aktivitas
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {Array.isArray(notifications) && notifications.slice(0, 10).map((notification, index) => {
                const enhancedInfo = getEnhancedMessage(notification);
                const isUnread = !notification.isRead;
                const fullTimestamp = new Date(notification.createdAt).toLocaleString('id-ID');

                return (
                  <div
                    key={`notification-${notification.id}-${index}`}
                    role="listitem"
                    className={`group relative transition-all duration-200 hover:bg-gray-50
  border-l-4
  ${isUnread ? 'border-l-blue-600 bg-white' : 'border-l-transparent bg-white'}
  ${hasSubmissionData(notification) ? 'cursor-pointer' : ''}
`}

                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (hasSubmissionData(notification)) {
                        handleViewDetail(notification);
                      }
                    }}
                  >
                    <div className="p-3 pl-7">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {/* Netral: selalu abu-abu agar tidak ada highlight biru lain */}
                          <div className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-gray-100">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4
                              className={`text-sm leading-tight ${
                                isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'
                              }`}
                              style={{
                                lineClamp: 2,
                                WebkitLineClamp: 2,
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {enhancedInfo.title}
                            </h4>
                            <span className="text-[11px] text-gray-500 whitespace-nowrap ml-2" title={fullTimestamp}>
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>

                          <p
                            className="text-xs text-gray-600 leading-relaxed mb-2"
                            style={{
                              lineClamp: 2,
                              WebkitLineClamp: 2,
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {enhancedInfo.message}
                          </p>

                          <div className="flex items-center justify-between">
                            {hasSubmissionData(notification) && (
                              <button className="inline-flex items-center text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors">
                                {enhancedInfo.action}
                              </button>
                            )}

                            {isUnread && (
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    const { scope, vendorId } = getScopeAndVendor();
                                    await markAsRead(notification.id, { scope, vendorId });
                                  } catch (error) {
                                    console.error('Error marking notification as read:', error);
                                  }
                                }}
                                className="inline-flex items-center text-xs text-gray-500 hover:text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                aria-label="Tandai sebagai dibaca"
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
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-gray-200 p-3 flex-shrink-0 bg-gray-50/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                {Math.min(notifications.length, 10)} dari {notifications.length}
              </span>
              {!!notifications.length && (
                <a
                  href="/dashboard/notifications"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                  onClick={onClose}
                >
                  Lihat semua →
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail Submission */}
      {selectedSubmission && selectedSubmissionId && (
        <>
          {session?.user?.role === 'APPROVER' && (
            <ApproverSubmissionDetailModal
              isOpen={isDetailModalOpen}
              onClose={handleCloseDetailModal}
              submissionId={selectedSubmissionId}
              onApprovalSubmitted={handleSubmissionUpdated}
            />
          )}

          {session?.user?.role === 'REVIEWER' && (
            <ReviewerSubmissionDetailModal
              isOpen={isDetailModalOpen}
              onClose={handleCloseDetailModal}
              submissionId={selectedSubmissionId}
              onReviewSubmitted={handleSubmissionUpdated}
            />
          )}

          {(session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'VENDOR') && (
            <SubmissionDetailModal
              submission={selectedSubmission}
              isOpen={isDetailModalOpen}
              onClose={handleCloseDetailModal}
            />
          )}
        </>
      )}

      {/* User Verification Modal for Vendor Details */}
      {selectedVendorUser && (
        <>
          {session?.user?.role === 'REVIEWER' ? (
            <UserVerificationModal
              isOpen={!!selectedVendorUser}
              onClose={() => {
                setSelectedVendorUser(null);
              }}
              user={selectedVendorUser}
              onUserUpdate={(updatedUser: UserData) => {
                setSelectedVendorUser(updatedUser);
              }}
              allowVerificationActions={true}
            />
          ) : (
            <div />
          )}
        </>
      )}
    </>
  );
}
