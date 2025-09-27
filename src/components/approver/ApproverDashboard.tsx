'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  EyeIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

import { Button } from '@/components/ui';
import { Alert } from '@/components/ui';
import { useSocket } from '@/components/common/RealtimeUpdates';
import ApproverSubmissionDetailModal from './ApproverSubmissionDetailModal';
import Link from 'next/link';

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
  updated_at?: string;
  reviewed_at?: string | null;
  approved_at?: string | null;
  reviewed_by?: string | null;
  approved_by?: string | null;
  workers: Array<{
    id: string;
    worker_name: string;
    worker_photo: string | null;
  }>;
}

interface DashboardStats {
  total: number;
  pending_approval_meets: number;
  pending_approval_not_meets: number;
  approved: number;
  rejected: number;
}

export default function ApproverDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending_approval_meets: 0,
    pending_approval_not_meets: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch stats dan 10 submission terakhir untuk dashboard
      const response = await fetch('/api/approver/simloks?page=1&limit=10&sortBy=reviewed_at&sortOrder=desc');
      if (!response.ok) {
        throw new Error('Gagal mengambil data dashboard');
      }
      
      const data = await response.json();
      setSubmissions(data.submissions);
      setStats(data.statistics);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Socket untuk real-time updates
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket) return;

    // Join approver room
    socket.emit('join', { role: 'APPROVER' });

    const handleNotificationNew = (notification: any) => {
      console.log('New notification received for approver:', notification);
      if (notification.type === 'reviewed_submission_approval') {
        fetchDashboardData();
      }
    };

    const handleStatsUpdate = (statsUpdate: any) => {
      console.log('Stats update received for approver:', statsUpdate);
      if (statsUpdate.scope === 'approver') {
        fetchDashboardData();
      }
    };

    const handleSubmissionReviewed = () => {
      console.log('Submission reviewed - updating approver dashboard');
      fetchDashboardData();
    };

    // Listen for new notifications (including reviewed submissions)
    socket.on('notification:new', handleNotificationNew);
    // Listen for stats updates
    socket.on('stats:update', handleStatsUpdate);
    // Listen for specific submission review events
    socket.on('submission:reviewed', handleSubmissionReviewed);

    return () => {
      socket.off('notification:new', handleNotificationNew);
      socket.off('stats:update', handleStatsUpdate);
      socket.off('submission:reviewed', handleSubmissionReviewed);
    };
  }, [socket, fetchDashboardData]);

  const handleViewDetail = (submissionId: string) => {
    setSelectedSubmission(submissionId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
  };

  const handleApprovalSubmitted = () => {
    fetchDashboardData();
    handleCloseModal();
  };

  const getStatusBadge = (status: string, type: 'review' | 'final') => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    if (type === 'review') {
      switch (status) {
        case 'PENDING_REVIEW':
          return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Menunggu Review</span>;
        case 'MEETS_REQUIREMENTS':
          return <span className={`${baseClasses} bg-green-100 text-green-800`}>Memenuhi Syarat</span>;
        case 'NOT_MEETS_REQUIREMENTS':
          return <span className={`${baseClasses} bg-red-100 text-red-800`}>Tidak Memenuhi Syarat</span>;
        default:
          return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
      }
    } else {
      switch (status) {
        case 'PENDING_APPROVAL':
          return <span className={`${baseClasses} bg-amber-100 text-amber-800`}>Menunggu Persetujuan</span>;
        case 'APPROVED':
          return <span className={`${baseClasses} bg-green-100 text-green-800`}>Disetujui</span>;
        case 'REJECTED':
          return <span className={`${baseClasses} bg-red-100 text-red-800`}>Ditolak</span>;
        default:
          return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
        
        {/* Loading Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden animate-pulse">
          <div className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="error" title="Error" message={error} className="mb-6" />
      )}

      {/* Statistics Cards - Dashboard Design */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Pengajuan</h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Menunggu Persetujuan</h3>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {stats.pending_approval_meets + stats.pending_approval_not_meets}
              </p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <ClockIcon className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Disetujui</h3>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Ditolak</h3>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <ChartBarIcon className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pengajuan Terbaru</h2>
              <p className="text-sm text-gray-500 mt-1">10 pengajuan terakhir untuk persetujuan</p>
            </div>
            <Link 
              href="/approver/submissions"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Lihat Semua Pengajuan
            </Link>
          </div>
        </div>
        
        {submissions.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada pengajuan</h3>
            <p className="mt-1 text-sm text-gray-500">Belum ada pengajuan yang perlu disetujui</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deskripsi Pekerjaan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status Review
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status Persetujuan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {submission.vendor_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.officer_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {submission.job_description}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.work_location}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(submission.review_status, 'review')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(submission.final_status, 'final')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(submission.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        onClick={() => handleViewDetail(submission.id)}
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedSubmission && (
        <ApproverSubmissionDetailModal
          submissionId={selectedSubmission}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onApprovalSubmitted={handleApprovalSubmitted}
        />
      )}
    </div>
  );
}