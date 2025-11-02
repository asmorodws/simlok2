'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  UserGroupIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';

import Button from '@/components/ui/button/Button';
import { useToast } from '@/hooks/useToast';
import { useSocket } from '@/components/common/RealtimeUpdates';
import ApproverSubmissionDetailModal from './ApproverSubmissionDetailModal';
import ApproverTable, { type ApproverSubmission } from '@/components/approver/ApproverTable';
import PageSkeleton from '@/components/ui/skeleton/PageSkeleton';
import { cachedFetch, apiCache } from '@/lib/api/client';

interface Submission {
  id: string;
  review_status: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
  approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
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
  note_for_approver?: string;
  note_for_vendor?: string;
  sika_document_upload?: string;
  simja_document_upload?: string;
  qrcode?: string;
  created_at: string;
  reviewed_at?: string;
  approved_at?: string;
  signer_position?: string;
  signer_name?: string;
  user: {
    id: string;
    officer_name: string;
    email: string;
    vendor_name: string;
  };
  reviewed_by_user?: {
    id: string;
    officer_name: string;
    email: string;
  };
  approved_by_final_user?: {
    id: string;
    officer_name: string;
    email: string;
  };
  worker_list: Array<{
    id: string;
    worker_name: string;
    worker_photo: string | null;
  }>;
}

interface SubmissionsResponse {
  submissions: Submission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Empty State Component
function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-12 text-center">
        <div className="mx-auto h-24 w-24 text-gray-300 mb-6">
          <DocumentCheckIcon className="h-full w-full" />
        </div>

        {hasFilters ? (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Tidak ada data yang sesuai dengan filter
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Tidak ditemukan pengajuan yang sesuai dengan kriteria pencarian atau filter yang Anda
              terapkan.
            </p>
            <Button onClick={onClearFilters} variant="outline" className="mx-auto">
              <XMarkIcon className="h-4 w-4 mr-2" />
              Hapus Filter
            </Button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Belum ada pengajuan untuk disetujui
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Saat ini belum ada pengajuan Simlok yang telah direview dan memerlukan persetujuan
              final dari Anda.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <ClipboardDocumentListIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-900">Vendor Submit</p>
                <p className="text-xs text-blue-600">Pengajuan masuk</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <UserGroupIcon className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-yellow-900">Reviewer Check</p>
                <p className="text-xs text-yellow-600">Proses review</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-900">Approver Final</p>
                <p className="text-xs text-green-600">Menunggu Anda</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


export default function ApproverSubmissionsManagement() {
  const [submissions, setSubmissions] = useState<ApproverSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  // Modal state (pakai ID agar selaras dengan ApproverTable)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filters & sorting & pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('');
  const [finalStatusFilter, setFinalStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('reviewed_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Socket connection
  const socket = useSocket();
  
  // Ref untuk debouncing socket events
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref untuk tracking mounting state
  const isMountedRef = useRef(false);
  // Ref untuk tracking ongoing fetch
  const fetchingRef = useRef(false);
  // Ref untuk menyimpan fetchSubmissions function untuk socket events
  const fetchSubmissionsRef = useRef<(silent?: boolean) => Promise<void>>(undefined as any);

  const fetchSubmissions = useCallback(async (silent = false) => {
    // Prevent duplicate fetch calls
    if (fetchingRef.current) {
      console.log('⏭️ Skipping fetch - already in progress');
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sortBy,
        sortOrder,
      });

      if (searchTerm) params.append('search', searchTerm);
      if (reviewStatusFilter) params.append('reviewStatus', reviewStatusFilter);
      if (finalStatusFilter) params.append('finalStatus', finalStatusFilter);

      const data = await cachedFetch<SubmissionsResponse>(
        `/api/submissions?${params.toString()}`,
        { cacheTTL: 30 * 1000 }
      );
      
      // Kita tidak menggunakan field worker_list di tabel, jadi cast aman:
      setSubmissions((data.submissions as unknown) as ApproverSubmission[]);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      // Hanya tampilkan error toast jika bukan silent refresh
      if (!silent) {
        showError('Gagal Memuat Data', 'Tidak dapat mengambil data pengajuan. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [currentPage, searchTerm, reviewStatusFilter, finalStatusFilter, sortBy, sortOrder, showError]);

  // Update ref setiap kali fetchSubmissions berubah
  useEffect(() => {
    fetchSubmissionsRef.current = fetchSubmissions;
  }, [fetchSubmissions]);

  // Initial fetch saat component mount
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      fetchSubmissions();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Fetch ulang saat dependencies berubah (kecuali saat initial mount)
  useEffect(() => {
    if (isMountedRef.current) {
      fetchSubmissions();
    }
  }, [currentPage, searchTerm, reviewStatusFilter, finalStatusFilter, sortBy, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.emit('join', { role: 'APPROVER' });

    const handleSubmissionUpdate = () => {
      // Debounce refresh untuk menghindari multiple simultaneous calls
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Approver submissions socket refresh triggered');
        // TIDAK invalidate cache - biarkan cachedFetch handle deduplication
        fetchSubmissionsRef.current?.(true);
      }, 300); // Debounce 300ms
    };

    socket.on('submission:reviewed', handleSubmissionUpdate);
    socket.on('submission:approved', handleSubmissionUpdate);
    socket.on('submission:rejected', handleSubmissionUpdate);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      socket.off('submission:reviewed', handleSubmissionUpdate);
      socket.off('submission:approved', handleSubmissionUpdate);
      socket.off('submission:rejected', handleSubmissionUpdate);
    };
  }, [socket]); // HANYA socket sebagai dependency

  // Listen to custom events untuk refresh data submissions list dari notification panel
  useEffect(() => {
    const handleSubmissionsRefresh = () => {
      console.log('🔄 Approver submissions list received refresh event');
      // Invalidate cache hanya untuk specific pattern
      apiCache.invalidatePattern('/api/submissions?page=');
      fetchSubmissionsRef.current?.(true);
    };

    window.addEventListener('approver-dashboard-refresh', handleSubmissionsRefresh);
    
    return () => {
      window.removeEventListener('approver-dashboard-refresh', handleSubmissionsRefresh);
    };
  }, []); // Empty dependency - hanya setup sekali



  const clearFilters = () => {
    setSearchTerm('');
    setReviewStatusFilter('');
    setFinalStatusFilter('');
    setCurrentPage(1);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedSubmissionId(null);
  };

  const handleApprovalSubmitted = () => {
    fetchSubmissions(); // Refresh data after approval
    handleCloseModal();
  };

  const hasFilters = Boolean(searchTerm || reviewStatusFilter || finalStatusFilter);

  if (loading && submissions.length === 0) {
    return <PageSkeleton hasHeader hasFilters hasStats={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters - Unified Design */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Persetujuan Pengajuan</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola dan setujui pengajuan SIMLOK</p>
        </div>

        {/* Toolbar - Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan nama vendor, deskripsi pekerjaan, atau petugas..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 md:w-auto">
            <select
              value={reviewStatusFilter}
              onChange={(e) => {
                setReviewStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm"
            >
              <option value="">Semua Status Review</option>
              <option value="MEETS_REQUIREMENTS">Memenuhi Syarat</option>
              <option value="NOT_MEETS_REQUIREMENTS">Tidak Memenuhi Syarat</option>
            </select>
            <select
              value={finalStatusFilter}
              onChange={(e) => {
                setFinalStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm"
            >
              <option value="">Semua Status Akhir</option>
              <option value="PENDING_APPROVAL">Menunggu Persetujuan</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
            </select>
            {hasFilters && (
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Empty vs Table */}
      {!loading && submissions.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {/* TABEL REUSABLE: sama seperti reviewer */}
          <ApproverTable
            data={submissions}
            loading={loading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(field, order) => {
              setSortBy(String(field));
              setSortOrder(order);
              setCurrentPage(1);
            }}
            page={pagination.page}
            pages={pagination.pages}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={(p) => setCurrentPage(p)}
            onOpenDetail={(id) => {
              setSelectedSubmissionId(id);
              setShowDetailModal(true);
            }}
            emptyTitle={hasFilters ? 'Tidak ada data sesuai filter' : 'Tidak ada pengajuan'}
            emptyDescription={
              hasFilters ? 'Coba hapus atau ubah filter pencarian.' : 'Belum ada pengajuan yang perlu disetujui.'
            }
          />
        </div>
      )}

      {/* Detail Modal */}
      <ApproverSubmissionDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        submissionId={selectedSubmissionId ?? ''}
        onApprovalSubmitted={handleApprovalSubmitted}
      />
    </div>
  );
}
