'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  PencilIcon,
  UserIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/Badge';
import Alert from '@/components/ui/alert/Alert';
import ReviewerSubmissionDetailModal from './ReviewerSubmissionDetailModal';
import { useSocket } from '@/components/common/RealtimeUpdates';

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

export default function ReviewerSubmissionsManagement() {
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
  const [sortBy, setSortBy] = useState('created_at');
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

      const response = await fetch(`/api/reviewer/simloks?${params}`);
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

    // Join reviewer room
    socket.emit('join', { role: 'REVIEWER' });

    const handleSubmissionUpdate = () => {
      console.log('Submission update received, refreshing reviewer submissions');
      fetchSubmissions();
    };

    socket.on('submission:created', handleSubmissionUpdate);
    socket.on('submission:reviewed', handleSubmissionUpdate);
    socket.on('submission:approved', handleSubmissionUpdate);
    socket.on('submission:rejected', handleSubmissionUpdate);

    return () => {
      socket.off('submission:created', handleSubmissionUpdate);
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
      case 'PENDING_REVIEW':
        return <Badge variant="warning">Menunggu Review</Badge>;
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

  if (loading && submissions.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters - Unified Design */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Review Pengajuan</h1>
            <p className="text-sm text-gray-500 mt-1">Kelola dan review pengajuan SIMLOK</p>
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
              <option value="PENDING_REVIEW">Menunggu Review</option>
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
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Error" message={error} />
      )}

      {/* Submissions Table - Unified Design */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {submissions.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardDocumentListIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada pengajuan</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {searchTerm || reviewStatusFilter || finalStatusFilter 
                ? 'Tidak ada pengajuan yang sesuai dengan filter yang dipilih.'
                : 'Belum ada pengajuan yang tersedia untuk di-review.'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Tanggal & Vendor</span>
                        {getSortIcon('created_at')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deskripsi Pekerjaan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Review
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          <div className="text-sm text-gray-900">
                            {new Date(submission.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="font-medium text-gray-900">{submission.vendor_name}</div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <UserIcon className="h-4 w-4" />
                            <span>{submission.officer_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <div className="font-medium text-gray-900 text-sm line-clamp-2">
                            {submission.job_description}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {submission.work_location}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getReviewStatusBadge(submission.review_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getFinalStatusBadge(submission.final_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Button
                          onClick={() => handleViewDetails(submission)}
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          {submission.final_status === 'PENDING_APPROVAL' ? 'Review' : 'Lihat'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Menampilkan {((currentPage - 1) * pagination.limit) + 1} sampai{' '}
                    {Math.min(currentPage * pagination.limit, pagination.total)} dari{' '}
                    {pagination.total} pengajuan
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Sebelumnya
                    </Button>
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                      .filter(page => {
                        const distance = Math.abs(page - currentPage);
                        return distance === 0 || distance === 1 || page === 1 || page === pagination.pages;
                      })
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-3 py-1 text-gray-500">...</span>
                          )}
                          <Button
                            onClick={() => setCurrentPage(page)}
                            variant={currentPage === page ? "primary" : "outline"}
                            size="sm"
                            className={currentPage === page ? "bg-blue-600 text-white" : ""}
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      ))}
                    <Button
                      onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                      disabled={currentPage === pagination.pages}
                      variant="outline"
                      size="sm"
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedSubmission && (
        <ReviewerSubmissionDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSubmission(null);
          }}
          submissionId={selectedSubmission.id}
          onReviewSubmitted={() => {
            fetchSubmissions();
          }}
        />
      )}
    </div>
  );
}