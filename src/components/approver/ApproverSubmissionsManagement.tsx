'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  EyeIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/Badge';
import Alert from '@/components/ui/alert/Alert';
import { useSocket } from '@/components/common/RealtimeUpdates';
import ApproverSubmissionDetailModal from './ApproverSubmissionDetailModal';

interface Submission {
  id: string;
  approval_status: string;
  review_status: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
  final_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
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
  review_note?: string;
  final_note?: string;
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
function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
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
              Tidak ditemukan pengajuan yang sesuai dengan kriteria pencarian atau filter yang Anda terapkan.
            </p>
            <Button
              onClick={onClearFilters}
              variant="outline"
              className="mx-auto"
            >
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
              Saat ini belum ada pengajuan Simlok yang telah direview dan memerlukan persetujuan final dari Anda.
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

// Loading State Component  
function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Loading Filters */}
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 h-10 bg-gray-200 rounded"></div>
          <div className="sm:w-48 h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
      
      {/* Loading Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApproverSubmissionsManagement() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Filters and pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('');
  const [finalStatusFilter, setFinalStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('reviewed_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Socket connection
  const socket = useSocket();

  const fetchSubmissions = useCallback(async () => {
    try {
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

      const response = await fetch(`/api/approver/simloks?${params}`);
      if (!response.ok) {
        throw new Error('Gagal mengambil data pengajuan');
      }

      const data: SubmissionsResponse = await response.json();
      setSubmissions(data.submissions);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError('Gagal memuat data pengajuan');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, reviewStatusFilter, finalStatusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Join approver room
    socket.emit('join', { role: 'APPROVER' });

    const handleSubmissionUpdate = () => {
      console.log('Submission update received, refreshing approver submissions');
      fetchSubmissions();
    };

    socket.on('submission:reviewed', handleSubmissionUpdate);
    socket.on('submission:approved', handleSubmissionUpdate);
    socket.on('submission:rejected', handleSubmissionUpdate);

    return () => {
      socket.off('submission:reviewed', handleSubmissionUpdate);
      socket.off('submission:approved', handleSubmissionUpdate);
      socket.off('submission:rejected', handleSubmissionUpdate);
    };
  }, [socket, fetchSubmissions]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ChevronUpDownIcon className="h-4 w-4" />;
    return sortOrder === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4" />
      : <ChevronDownIcon className="h-4 w-4" />;
  };

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case 'MEETS_REQUIREMENTS':
        return <Badge variant="success">Memenuhi Syarat</Badge>;
      case 'NOT_MEETS_REQUIREMENTS':
        return <Badge variant="destructive">Tidak Memenuhi Syarat</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getFinalStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <Badge variant="warning">Menunggu Persetujuan</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Disetujui</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const handleViewDetails = (submission: Submission) => {
    setSelectedSubmission(submission);
    setShowDetailModal(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setReviewStatusFilter('');
    setFinalStatusFilter('');
    setCurrentPage(1);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedSubmission(null);
  };

  const handleApprovalSubmitted = () => {
    fetchSubmissions(); // Refresh data after approval
  };

  const hasFilters = searchTerm || reviewStatusFilter || finalStatusFilter;

  if (loading && submissions.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters - Unified Design */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Persetujuan Pengajuan</h1>
            <p className="text-sm text-gray-500 mt-1">Kelola dan setujui pengajuan SIMLOK</p>
          </div>
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

      {error && (
        <Alert variant="error" title="Error" message={error} />
      )}

      {/* Show empty state if no submissions */}
      {!loading && submissions.length === 0 ? (
        <EmptyState hasFilters={hasFilters ? true : false} onClearFilters={clearFilters} />
      ) : (
        <div>
          {/* Submissions Table - Unified Design */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('reviewed_at')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Tanggal Review</span>
                    {getSortIcon('reviewed_at')}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('vendor_name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Vendor & PJ</span>
                    {getSortIcon('vendor_name')}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pekerjaan & Lokasi
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status Review
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status Final
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reviewer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {submission.reviewed_at 
                        ? new Date(submission.reviewed_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '-'
                      }
                    </div>
                    {submission.reviewed_at && (
                      <div className="text-xs text-gray-500">
                        {new Date(submission.reviewed_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-44">
                      <div className="text-sm font-medium text-gray-900 truncate" title={submission.vendor_name}>
                        {submission.vendor_name}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                        <UserIcon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate" title={submission.officer_name}>{submission.officer_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-52">
                      <div className="text-sm font-medium text-gray-900 truncate" title={submission.job_description}>
                        {submission.job_description}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 truncate" title={submission.work_location}>
                        📍 {submission.work_location}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getReviewStatusBadge(submission.review_status)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getFinalStatusBadge(submission.final_status)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-28">
                      <span className="truncate block" title={submission.reviewed_by_user?.officer_name || '-'}>
                        {submission.reviewed_by_user?.officer_name || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <Button
                      onClick={() => handleViewDetails(submission)}
                      size="sm"
                      variant={submission.final_status === 'PENDING_APPROVAL' ? 'primary' : 'outline'}
                      className="inline-flex items-center"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      {submission.final_status === 'PENDING_APPROVAL' ? 'Setujui' : 'Lihat'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>        {/* Enhanced Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Sebelumnya
              </Button>
              <Button
                onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                disabled={currentPage === pagination.pages}
                variant="outline"
                size="sm"
              >
                Selanjutnya
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Menampilkan{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * pagination.limit + 1}
                  </span>{' '}
                  sampai{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pagination.limit, pagination.total)}
                  </span>{' '}
                  dari{' '}
                  <span className="font-medium">{pagination.total}</span> pengajuan
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="rounded-r-none"
                  >
                    Sebelumnya
                  </Button>
                  
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        variant={currentPage === pageNum ? "primary" : "outline"}
                        size="sm"
                        className="rounded-none"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  <Button
                    onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                    disabled={currentPage === pagination.pages}
                    variant="outline"
                    size="sm"
                    className="rounded-l-none"
                  >
                    Selanjutnya
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
        </div>
        </div>
      )}

      {/* New Detail Modal */}
      <ApproverSubmissionDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseModal}
        submissionId={selectedSubmission?.id || ''}
        onApprovalSubmitted={handleApprovalSubmitted}
      />
    </div>
  );
}