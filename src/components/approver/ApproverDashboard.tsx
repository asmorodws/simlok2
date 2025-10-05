'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

import Alert from '@/components/ui/alert/Alert';
import { useSocket } from '@/components/common/RealtimeUpdates';
import StatsCardsLoader from '@/components/ui/StatsCardsLoader';
import TableLoader from '@/components/ui/TableLoader';
import ApproverSubmissionDetailModal from './ApproverSubmissionDetailModal';
import Link from 'next/link';
import ApproverTable, { type ApproverSubmission } from '@/components/approver/ApproverTable';

interface DashboardStats {
  total: number;
  pending_approval_meets: number;
  pending_approval_not_meets: number;
  approved: number;
  rejected: number;
}

export default function ApproverDashboard() {
  const [submissions, setSubmissions] = useState<ApproverSubmission[]>([]);
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
      const response = await fetch(
        '/api/approver/simloks?page=1&limit=10&sortBy=reviewed_at&sortOrder=desc'
      );
      if (!response.ok) throw new Error('Gagal mengambil data dashboard');

      const data = await response.json();
      setSubmissions((data.submissions ?? []) as ApproverSubmission[]);
      setStats(
        data.statistics ?? {
          total: 0,
          pending_approval_meets: 0,
          pending_approval_not_meets: 0,
          approved: 0,
          rejected: 0,
        }
      );
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

    socket.emit('join', { role: 'APPROVER' });

    const handleNotificationNew = (notification: any) => {
      if (notification?.type === 'reviewed_submission_approval') {
        fetchDashboardData();
      }
    };

    const handleStatsUpdate = (statsUpdate: any) => {
      if (statsUpdate?.scope === 'approver') {
        fetchDashboardData();
      }
    };

    const handleSubmissionReviewed = () => {
      fetchDashboardData();
    };

    socket.on('notification:new', handleNotificationNew);
    socket.on('stats:update', handleStatsUpdate);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <StatsCardsLoader count={4} />
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <TableLoader rows={5} columns={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && <Alert variant="error" title="Error" message={error} className="mb-6" />}

      {/* Statistics Cards */}
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

      {/* Recent Submissions (tabel reusable, tampilan seragam dgn Reviewer) */}
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

        <ApproverTable
          data={submissions}
          sortBy="created_at"
          sortOrder="desc"
          onOpenDetail={handleViewDetail}
          emptyTitle="Tidak ada pengajuan"
          emptyDescription="Belum ada pengajuan yang perlu disetujui"
        />
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
