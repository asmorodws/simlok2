'use client';

import { useState, useEffect, useRef } from 'react';
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
  XCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import PageLoader from '@/components/ui/PageLoader';
import SubmissionDetailModal from '@/components/vendor/SubmissionDetailModal';
import ApproverSubmissionDetailModal from '@/components/approver/ApproverSubmissionDetailModal';
import ReviewerSubmissionDetailModal from '@/components/reviewer/ReviewerSubmissionDetailModal';
import { fetchJSON, FetchError } from '@/lib/fetchJson';

// ---- Types ----
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

type NotifListResponse = {
  success: boolean;
  data: {
    data: Notification[];
    pagination?: any;
  };
};

// ---- anti-race util ----
function useVersion() {
  const v = useRef(0);
  const bump = () => ++v.current;
  const isStale = (snapshot: number) => snapshot !== v.current;
  return { current: () => v.current, bump, isStale };
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const { showError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const version = useVersion();

  const refetch = async (scope: string) => {
    const snap = version.current();
    setLoading(true);
    try {
      const res = await fetchJSON<NotifListResponse>(`/api/v1/notifications?scope=${scope}&filter=all&pageSize=100`);
      if (version.isStale(snap)) return;
      setNotifications(res?.data?.data ?? []);
    } catch (e) {
      console.error('Refetch notifications error:', e);
    } finally {
      if (!version.isStale(snap)) setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!session?.user?.id) return;
      let scope = session.user.role.toLowerCase();
      if (session.user.role === 'SUPER_ADMIN') scope = 'admin';
      version.bump();
      await refetch(scope);
    };
    if (status === 'authenticated') run();
  }, [session?.user?.id, session?.user?.role, status]);

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

  const [markingAsRead, setMarkingAsRead] = useState(new Set<string>());

  const markAsRead = async (notificationId: string) => {
    if (markingAsRead.has(notificationId)) return;
    const notification = notifications.find(n => n.id === notificationId);
    if (notification?.isRead) return;

    try {
      setMarkingAsRead(prev => new Set([...prev, notificationId]));
      setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n)));
      await fetchJSON(`/api/v1/notifications/${notificationId}/read`, { method: 'POST' });
    } catch (error) {
      console.error('Error marking as read:', error);
      setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, isRead: false } : n)));
      showError('Gagal', 'Tidak dapat menandai notifikasi sebagai dibaca');
    } finally {
      setMarkingAsRead(prev => {
        const s = new Set(prev);
        s.delete(notificationId);
        return s;
      });
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSubmission(null);
    setSelectedSubmissionId(null);
  };

  const handleSubmissionUpdated = () => {
    handleCloseDetailModal();
    // Refresh notifications after submission is updated
    let scope = session?.user?.role?.toLowerCase() || 'vendor';
    if (session?.user?.role === 'SUPER_ADMIN') scope = 'admin';
    version.bump();
    refetch(scope);
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      const scopeBody = session?.user?.role;
      await fetchJSON('/api/v1/notifications/read-all', {
        method: 'POST',
        body: JSON.stringify({ scope: scopeBody }),
      });
      let scope = session?.user?.role?.toLowerCase() || 'vendor';
      if (session?.user?.role === 'SUPER_ADMIN') scope = 'admin';
      version.bump();
      setTimeout(() => refetch(scope), 300);
    } catch (error) {
      console.error('Error mark all read:', error);
      showError('Gagal', 'Tidak dapat menandai semua notifikasi sebagai dibaca');
      let scope = session?.user?.role?.toLowerCase() || 'vendor';
      if (session?.user?.role === 'SUPER_ADMIN') scope = 'admin';
      version.bump();
      refetch(scope);
    }
  };

  // ---- UI helpers ----
  const formatTimeAgo = (dateString: string): string => {
    if (!dateString) return 'Tidak diketahui';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Tanggal tidak valid';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari yang lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = 'w-5 h-5';
    switch (type) {
      // ✅ Approved - Green
      case 'submission_approved':
        return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
      
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
      case 'new_vendor':
      case 'vendor_verified':
      case 'user_registered':
      case 'new_user_verification':
        return <UserPlusIcon className={`${iconClass} text-blue-600`} />;
      
      // 🔔 Default - Gray Bell
      default:
        return <BellIcon className={`${iconClass} text-gray-600`} />;
    }
  };

  const submissionTypes = [
    'submission_approved',
    'submission_rejected',
    'submission_pending',
    'new_submission',
    'new_submission_review',
    'reviewed_submission_approval',
    'status_change'
  ];
  const vendorTypes = ['user_registered', 'new_vendor', 'new_user_verification', 'vendor_verified', 'vendor_registered'];

  const hasSubmissionData = (n: Notification) => {
    if (submissionTypes.includes(n.type)) return true;
    if (n.data) {
      try {
        const parsed = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
        if (parsed?.submissionId || parsed?.submission_id) return true;
      } catch {
        if (typeof n.data === 'string' && n.data.includes('submissionId')) return true;
      }
    }
    const text = `${n.title} ${n.message}`.toLowerCase();
    return ['pengajuan','submission','simlok'].some(k => text.includes(k));
  };

  const hasVendorData = (n: Notification) => {
    if (vendorTypes.includes(n.type)) return true;
    if (n.data) {
      try {
        const parsed = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
        if (parsed?.vendorId || parsed?.userId) return true;
      } catch {
        if (typeof n.data === 'string' && n.data.includes('vendorId')) return true;
      }
    }
    const text = `${n.title} ${n.message}`.toLowerCase();
    return ['pendaftaran vendor','vendor baru mendaftar','verifikasi vendor'].some(k => text.includes(k));
  };

  const handleViewDetail = async (n: Notification) => {
    if (!n.isRead) await markAsRead(n.id);

    if (hasVendorData(n)) {
      showError('Info', 'Detail vendor tidak tersedia di halaman ini. Gunakan panel notifikasi untuk detail vendor.');
      return;
    }

    if (hasSubmissionData(n)) {
      try {
        let submissionId = '';
        if (n.data) {
          try {
            const parsed = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
            submissionId = parsed?.submissionId || parsed?.submission_id || '';
          } catch {
            if (typeof n.data === 'string') {
              const m = n.data.match(/submissionId[:\s]*([a-zA-Z0-9_-]+)/);
              if (m?.[1]) submissionId = m[1];
            }
          }
        }
        if (!submissionId) {
          const patterns = [
            /ID[:\s]*([a-zA-Z0-9_-]+)/,
            /submission[:\s]*([a-zA-Z0-9_-]+)/i,
            /pengajuan[:\s]*([a-zA-Z0-9_-]+)/i,
            /([a-zA-Z0-9_-]{20,})/
          ];
          for (const p of patterns) {
            const m1 = n.message.match(p);
            const m2 = n.title.match(p);
            if (m1?.[1]) { submissionId = m1[1]; break; }
            if (m2?.[1]) { submissionId = m2[1]; break; }
          }
        }
        if (!submissionId) {
          showError('Error', 'ID submission tidak ditemukan dalam notifikasi ini');
          return;
        }
        
        // For APPROVER and REVIEWER, use ID-based modal (no need to fetch full data)
        if (session?.user?.role === 'APPROVER' || session?.user?.role === 'REVIEWER') {
          setSelectedSubmissionId(submissionId);
          setIsDetailModalOpen(true);
          return;
        }
        
        // For VENDOR and others, fetch submission detail for SubmissionDetailModal
        const response = await fetchJSON<{ submission?: Submission }>(`/api/submissions/${submissionId}`);
        
        // Extract submission from response
        const submissionData = response.submission
        
        if (!submissionData) {
          showError('Error', 'Data submission tidak ditemukan');
          return;
        }
        
        setSelectedSubmission(submissionData);
        setIsDetailModalOpen(true);
      } catch (error: unknown) {
        console.error('Error loading submission detail:', error);
        
        // Handle FetchError with status codes
        if (error instanceof FetchError) {
          if (error.status === 404) {
            showError('Tidak Ditemukan', 'Pengajuan tidak ditemukan atau sudah dihapus');
          } else if (error.status === 403) {
            showError('Akses Ditolak', 'Anda tidak memiliki akses untuk melihat pengajuan ini');
          } else {
            showError('Error', error.message || 'Terjadi kesalahan saat memuat detail submission');
          }
        } else {
          showError('Error', 'Terjadi kesalahan saat memuat detail submission');
        }
      }
      return;
    }

    showError('Info', 'Notifikasi ini tidak memiliki detail khusus untuk ditampilkan');
  };

  const truncateText = (text: string, maxLength = 100) =>
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  const filteredNotifications = Array.isArray(notifications)
    ? notifications
        .filter(n => (filter === 'unread' ? !n.isRead : filter === 'read' ? n.isRead : true))
        .filter(n =>
          !searchTerm
            ? true
            : n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              n.message.toLowerCase().includes(searchTerm.toLowerCase())
        )
    : [];

  if (status === 'loading') {
    return (
      <SidebarLayout title="Memuat Notifikasi" titlePage="Notifikasi">
        <div className="max-w-5xl mx-auto px-3 md:px-6">
          <PageLoader message="Memuat notifikasi..." fullScreen={false} />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <RoleGate allowedRoles={["SUPER_ADMIN", "VENDOR", "APPROVER", "REVIEWER", "VISITOR"]}>
      <SidebarLayout title="Semua Notifikasi" titlePage="Notifikasi">
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
                <h1 className="text-base md:text-lg font-semibold text-gray-900">Notifikasi</h1>
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
              <div className="md:col-span-7">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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

              <div className="md:col-span-5 flex gap-2 md:justify-end">
                <div className="flex rounded-lg border border-gray-300 bg-white p-1">
                  {(['all', 'unread', 'read'] as const).map((filterOption) => (
                    <button
                      key={filterOption}
                      onClick={() => setFilter(filterOption)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        filter === filterOption ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
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

          {/* List */}
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <InboxIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm 
                    ? 'Tidak ada hasil' 
                    : filter === 'unread' 
                      ? 'Tidak ada notifikasi belum dibaca'
                      : filter === 'read'
                        ? 'Tidak ada notifikasi yang sudah dibaca'
                        : 'Tidak ada notifikasi'
                  }
                </h3>
                <p className="text-sm text-gray-500 text-center max-w-sm">
                  {searchTerm
                    ? `Tidak ditemukan notifikasi yang cocok dengan "${searchTerm}"`
                    : filter === 'unread'
                      ? 'Semua notifikasi Anda sudah dibaca'
                      : filter === 'read'
                        ? 'Belum ada notifikasi yang dibaca'
                        : 'Anda akan melihat notifikasi baru di sini ketika ada aktivitas'}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => (window.location.href = '/dashboard')}
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
                {filteredNotifications.map((n) => {
                  const isUnread = !n.isRead;
                  const fullTimestamp = new Date(n.createdAt).toLocaleString('id-ID');

                  return (
                    <div
                      key={n.id}
                      className={`relative flex items-start gap-3 p-3 md:p-4 transition-all duration-200 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500/30
                        border-l-4
                        ${isUnread ? 'border-l-blue-600 bg-white' : 'border-l-transparent bg-white'}
                        ${hasSubmissionData(n) || hasVendorData(n) ? 'cursor-pointer' : ''}
                      `}
                      onClick={() => handleViewDetail(n)}
                      role="listitem"
                    >
                      {/* HAPUS dot biru agar hanya strip kiri yang jadi indikator */}
                      {/* <div className="absolute left-1 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-blue-600" /> */}

                      {/* Avatar ikon: selalu abu-abu */}
                      <div className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center ml-2 bg-gray-100">
                        {getNotificationIcon(n.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`text-sm md:text-base leading-tight ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}
                              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                            >
                              {truncateText(n.title, 80)}
                            </h3>
                            <p
                              className="mt-0.5 text-xs md:text-sm text-gray-600 leading-relaxed"
                              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                            >
                              {truncateText(n.message, 120)}
                            </p>
                          </div>

                          <span className="text-[11px] md:text-xs text-gray-500 whitespace-nowrap ml-3" title={fullTimestamp}>
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>

                        {(hasSubmissionData(n) || hasVendorData(n)) && (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <button className="inline-flex items-center text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors">
                              Lihat detail
                              <ArrowRightIcon className="w-3 h-3 ml-1" />
                            </button>

                            {isUnread && (
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  await markAsRead(n.id);
                                }}
                                className="inline-flex items-center text-xs text-gray-500 hover:text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
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

            {filteredNotifications.length > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-500 p-3 border-t border-gray-100 bg-gray-50/50">
                <span>
                  Menampilkan {filteredNotifications.length} dari {Array.isArray(notifications) ? notifications.length : 0} notifikasi
                  {filter !== 'all' && ` (filter: ${filter === 'unread' ? 'belum dibaca' : 'sudah dibaca'})`}
                </span>
                <span className="text-xs text-gray-400">
                  💡 Semua notifikasi tetap tersimpan
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modals - Different modal for each role */}
        {session?.user?.role === 'APPROVER' && selectedSubmissionId && (
          <ApproverSubmissionDetailModal
            isOpen={isDetailModalOpen}
            onClose={handleCloseDetailModal}
            submissionId={selectedSubmissionId}
            onApprovalSubmitted={handleSubmissionUpdated}
          />
        )}

        {session?.user?.role === 'REVIEWER' && selectedSubmissionId && (
          <ReviewerSubmissionDetailModal
            isOpen={isDetailModalOpen}
            onClose={handleCloseDetailModal}
            submissionId={selectedSubmissionId}
            onReviewSubmitted={handleSubmissionUpdated}
          />
        )}

        {(session?.user?.role === 'VENDOR' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'VISITOR') && selectedSubmission && (
          <SubmissionDetailModal
            submission={selectedSubmission}
            isOpen={isDetailModalOpen}
            onClose={handleCloseDetailModal}
          />
        )}
      </SidebarLayout>
    </RoleGate>
  );
}
