'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

import Button from '@/components/ui/button/Button';
import Alert from '@/components/ui/alert/Alert';
import { useSocket } from '@/components/common/RealtimeUpdates';
import ReviewerSubmissionDetailModal from './ReviewerSubmissionDetailModal';
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
  reviewed_at?: string;
  approved_at?: string;
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

interface StatsData {
  pendingReview: number;
  meetsRequirements: number;
  notMeetsRequirements: number;
  total: number;
  pendingUserVerifications?: number;
  totalVerifiedUsers?: number;
}

const ReviewerDashboard = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<StatsData>({ 
    pendingReview: 0, 
    meetsRequirements: 0, 
    notMeetsRequirements: 0, 
    total: 0,
    pendingUserVerifications: 0,
    totalVerifiedUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch stats dan 10 submission terakhir untuk dashboard
      const response = await fetch('/api/reviewer/simloks?page=1&limit=10&sortBy=created_at&sortOrder=desc');
      if (!response.ok) {
        throw new Error('Gagal mengambil data dashboard');
      }
      
      const data = await response.json();
      setSubmissions(data.submissions || []);
      setStats(data.stats || { pendingReview: 0, meetsRequirements: 0, notMeetsRequirements: 0, total: 0 });
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

    // Join reviewer room
    socket.emit('join', { role: 'REVIEWER' });

    const handleNotificationNew = (notification: any) => {
      console.log('New notification received for reviewer:', notification);
      if (notification.type === 'new_submission_review') {
        fetchDashboardData();
      }
    };

    const handleStatsUpdate = (statsUpdate: any) => {
      console.log('Stats update received for reviewer:', statsUpdate);
      if (statsUpdate.scope === 'reviewer') {
        fetchDashboardData();
      }
    };

    const handleSubmissionCreated = () => {
      console.log('New submission created - updating reviewer dashboard');
      fetchDashboardData();
    };

    // Listen for new notifications (including new submissions to review)
    socket.on('notification:new', handleNotificationNew);
    // Listen for stats updates
    socket.on('stats:update', handleStatsUpdate);
    // Listen for new submission events
    socket.on('submission:created', handleSubmissionCreated);

    return () => {
      socket.off('notification:new', handleNotificationNew);
      socket.off('stats:update', handleStatsUpdate);
      socket.off('submission:created', handleSubmissionCreated);
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

  const handleReviewSubmitted = () => {
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
          return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Menunggu Persetujuan</span>;
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {error && (
          <Alert variant="error" title="Error" message={error} className="mb-6" />
        )}

        {/* Statistics Cards - Updated Design */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Pengajuan</h3>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.total || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Menunggu Review</h3>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats?.pendingReview || 0}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <ClockIcon className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Memenuhi Syarat</h3>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats?.meetsRequirements || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Tidak Memenuhi Syarat</h3>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats?.notMeetsRequirements || 0}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* User Verification Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">User Perlu Verifikasi</h3>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats?.pendingUserVerifications || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">User Terverifikasi</h3>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{stats?.totalVerifiedUsers || 0}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <ClipboardDocumentListIcon className="w-5 h-5 mr-2 text-blue-600" />
              10 Pengajuan Terakhir
            </h2>
            <Link href="/reviewer/submissions">
              <Button variant="outline" size="sm">
                Lihat Semua Pengajuan
              </Button>
            </Link>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada pengajuan</h3>
              <p className="mt-1 text-sm text-gray-500">Pengajuan yang perlu direview akan muncul di sini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor & Petugas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lokasi Kerja
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Review
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status Akhir
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Dibuat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{submission.vendor_name}</div>
                          <div className="text-sm text-gray-500">{submission.user.officer_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{submission.work_location}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(submission.review_status, 'review')}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(submission.final_status, 'final')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(submission.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          onClick={() => handleViewDetail(submission.id)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
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
      </div>

      {/* Modal */}
      {selectedSubmission && (
        <ReviewerSubmissionDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          submissionId={selectedSubmission}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
};

export default ReviewerDashboard;