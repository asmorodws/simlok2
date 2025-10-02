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
  XMarkIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import PageLoader from '@/components/ui/PageLoader';
import SubmissionDetailModal from '@/components/vendor/SubmissionDetailModal';
import { fetchJSON } from '@/lib/fetchJson'; // NEW

// Interface untuk notification (disesuaikan dari project_dump)
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

// Interface untuk submission (disesuaikan dari project_dump)
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

// NEW: tipe respons API v1 list
type NotifListResponse = {
  success: boolean;
  data: {
    data: Notification[];
    pagination?: any;
  };
};

// NEW: helper anti-race: versi state
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
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // NEW: versi untuk cegah race condition saat refetch beruntun
  const version = useVersion();

  // NEW: refetch util yang no-store + query buster
  const refetch = async (scope: string) => {
    const snap = version.current();
    setLoading(true);
    try {
      const res = await fetchJSON<NotifListResponse>(`/api/v1/notifications?scope=${scope}`);
      if (version.isStale(snap)) return; // ada refetch lebih baru, abaikan respons lama
      setNotifications(res?.data?.data ?? []);
    } catch (e) {
      console.error('💥 Refetch notifications error:', e);
    } finally {
      if (!version.isStale(snap)) setLoading(false);
    }
  };

  // Fetch awal
  useEffect(() => {
    const run = async () => {
      if (!session?.user?.id) return;
      let scope = session.user.role.toLowerCase();
      if (session.user.role === 'SUPER_ADMIN') scope = 'admin';

      version.bump(); // NEW: tandai versi baru
      await refetch(scope);
    };

    if (status === 'authenticated') run();
  }, [session?.user?.id, session?.user?.role, status]);

  // Hitung unread dari state lokal
  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

  // NEW: debounce kecil untuk refetch setelah aksi tulis
  const SLOW_BACKEND_COMPENSATION_MS = 200; // 150–300ms biasanya cukup

  const markAsRead = async (notificationId: string) => {
    // Optimistic update: langsung set local state
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );

    try {
      await fetchJSON(`/api/v1/notifications/${notificationId}/read`, { method: 'POST' });
      // Jadwalkan refetch singkat agar sinkron dgn server & cache invalidation
      let scope = session?.user?.role?.toLowerCase() || 'vendor';
      if (session?.user?.role === 'SUPER_ADMIN') scope = 'admin';

      version.bump(); // versi baru sebelum refetch
      setTimeout(() => refetch(scope), SLOW_BACKEND_COMPENSATION_MS);
    } catch (error) {
      console.error('💥 Error marking notification as read:', error);
      // Rollback jika gagal
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: false } : n))
      );
      showError('Gagal', 'Tidak dapat menandai notifikasi sebagai dibaca');
    }
  };

  const markAllAsRead = async () => {
    // Optimistic all
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    try {
      const scopeBody = session?.user?.role;
      await fetchJSON('/api/v1/notifications/read-all', {
        method: 'POST',
        body: JSON.stringify({ scope: scopeBody }),
      });

      // Jadwalkan refetch
      let scope = session?.user?.role?.toLowerCase() || 'vendor';
      if (session?.user?.role === 'SUPER_ADMIN') scope = 'admin';

      version.bump();
      setTimeout(() => refetch(scope), SLOW_BACKEND_COMPENSATION_MS);
    } catch (error) {
      console.error('💥 Error marking all as read:', error);
      showError('Gagal', 'Tidak dapat menandai semua notifikasi sebagai dibaca');
      // (opsional) refetch penuh untuk koreksi state
      let scope = session?.user?.role?.toLowerCase() || 'vendor';
      if (session?.user?.role === 'SUPER_ADMIN') scope = 'admin';
      version.bump();
      refetch(scope);
    }
  };

  // === Util UI yang sudah ada (dipertahankan) ===

  const formatTimeAgo = (dateString: string): string => {
    if (!dateString) return 'Tidak diketahui';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Tanggal tidak valid';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Baru saja';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'submission_approved': return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
      case 'submission_rejected': return <XMarkIcon className={`${iconClass} text-red-600`} />;
      case 'submission_pending': return <ClockIcon className={`${iconClass} text-amber-600`} />;
      case 'status_change': return <ShieldCheckIcon className={`${iconClass} text-blue-600`} />;
      case 'new_submission': return <DocumentPlusIcon className={`${iconClass} text-blue-600`} />;
      case 'new_vendor': return <UserPlusIcon className={`${iconClass} text-blue-600`} />;
      case 'vendor_verified': return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
      case 'user_registered': return <UserPlusIcon className={`${iconClass} text-blue-600`} />;
      default: return <BellIcon className={`${iconClass} text-gray-600`} />;
    }
  };

  const submissionTypes = ['submission_approved','submission_rejected','submission_pending','new_submission','status_change'];

  const hasSubmissionData = (notification: Notification) => {
    if (submissionTypes.includes(notification.type)) return true;
    if (notification.data) {
      try {
        const parsed = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
        if (parsed?.submissionId) return true;
      } catch {
        if (typeof notification.data === 'string' && notification.data.includes('submissionId')) return true;
      }
    }
    const text = `${notification.title} ${notification.message}`.toLowerCase();
    return ['pengajuan', 'submission', 'simlok'].some(k => text.includes(k));
  };

  const hasVendorData = (notification: Notification) => {
    const vendorTypes = ['new_vendor','vendor_verified','vendor_registered'];
    if (vendorTypes.includes(notification.type)) return true;
    if (notification.data) {
      try {
        const parsed = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
        if (parsed?.vendorId) return true;
      } catch {
        if (typeof notification.data === 'string' && notification.data.includes('vendorId')) return true;
      }
    }
    const text = `${notification.title} ${notification.message}`.toLowerCase();
    return ['vendor', 'perusahaan', 'pendaftaran vendor'].some(k => text.includes(k));
  };

  const handleViewDetail = async (notification: Notification) => {
    if (!notification.isRead) await markAsRead(notification.id);

    const isVendorNotification = hasVendorData(notification);
    if (isVendorNotification) {
      showError('Info', 'Detail vendor tidak tersedia saat ini');
      return;
    }
    if (!hasSubmissionData(notification)) return;

    try {
      let submissionId = '';
      if (notification.data) {
        try {
          const parsed = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data;
          if (parsed?.submissionId) submissionId = parsed.submissionId;
        } catch {
          if (typeof notification.data === 'string') {
            const match = notification.data.match(/submissionId[:\s]*([a-zA-Z0-9_-]+)/);
            if (match?.[1]) submissionId = match[1];
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
          const msg = notification.message.match(p);
          const ttl = notification.title.match(p);
          if (msg?.[1]) { submissionId = msg[1]; break; }
          if (ttl?.[1]) { submissionId = ttl[1]; break; }
        }
      }
      if (!submissionId) {
        showError('Error', 'ID submission tidak ditemukan dalam notifikasi ini');
        return;
      }

      const submission = await fetchJSON<Submission>(`/api/submissions/${submissionId}`);
      setSelectedSubmission(submission);
    } catch (error) {
      console.error('💥 Error handling notification detail:', error);
      showError('Error', 'Terjadi kesalahan saat memuat detail');
    }
  };

  const truncateText = (text: string, maxLength: number = 100) =>
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  const filteredNotifications = Array.isArray(notifications)
    ? notifications
        .filter((n) => (filter === 'unread' ? !n.isRead : filter === 'read' ? n.isRead : true))
        .filter((n) =>
          !searchTerm
            ? true
            : n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              n.message.toLowerCase().includes(searchTerm.toLowerCase())
        )
    : [];

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
    <RoleGate allowedRoles={["SUPER_ADMIN", "VENDOR", "APPROVER", "REVIEWER"]}>
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

              <div className="md:col-span-5 flex gap-2 md:justify-end">
                <div className="flex rounded-lg border border-gray-300 bg-white p-1">
                  {(['all', 'unread', 'read'] as const).map((filterOption) => (
                    <button
                      key={filterOption}
                      onClick={() => setFilter(filterOption)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        filter === filterOption ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900:text-gray-200'
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
                  {searchTerm ? 'Tidak ada hasil' : 'Tidak ada notifikasi'}
                </h3>
                <p className="text-sm text-gray-500 text-center max-w-sm">
                  {searchTerm
                    ? `Tidak ditemukan notifikasi yang cocok dengan "${searchTerm}"`
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
                {filteredNotifications.map((notification) => {
                  const isUnread = !notification.isRead;
                  const fullTimestamp = new Date(notification.createdAt).toLocaleString('id-ID');

                  return (
                    <div
                      key={notification.id}
                      className={`relative flex items-start gap-3 p-3 md:p-4 transition-all duration-200 hover:bg-gray-50:bg-gray-800/50 focus-within:ring-2 focus-within:ring-blue-500/30 ${
                        isUnread ? 'bg-blue-50/50 border-l-2 border-blue-500/50' : ''
                      } ${hasSubmissionData(notification) || hasVendorData(notification) ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (hasSubmissionData(notification) || hasVendorData(notification)) {
                          handleViewDetail(notification);
                        }
                      }}
                      role="listitem"
                    >
                      {isUnread && <div className="absolute left-2 top-2.5 h-2 w-2 rounded-full bg-blue-600"></div>}

                      <div className="shrink-0 h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center ml-2">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`text-sm md:text-base leading-tight ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}
                              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                            >
                              {truncateText(notification.title, 80)}
                            </h3>
                            <p
                              className="mt-0.5 text-xs md:text-sm text-gray-600 leading-relaxed"
                              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                            >
                              {truncateText(notification.message, 120)}
                            </p>
                          </div>

                          <span className="text-[11px] md:text-xs text-gray-500 whitespace-nowrap ml-3" title={fullTimestamp}>
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>

                        {(hasSubmissionData(notification) || hasVendorData(notification)) && (
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

            {filteredNotifications.length > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-500 p-3 border-t border-gray-100 bg-gray-50/50">
                <span>
                  Menampilkan {filteredNotifications.length} dari {Array.isArray(notifications) ? notifications.length : 0} notifikasi
                </span>
              </div>
            )}
          </div>
        </div>

        {selectedSubmission && (
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
