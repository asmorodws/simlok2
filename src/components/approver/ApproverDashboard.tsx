'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

import { useToast } from '@/hooks/useToast';
import { useSocket } from '@/components/common/RealtimeUpdates';
import { SkeletonDashboardCard, SkeletonTable } from '@/components/ui/skeleton';
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
  const [statsLoading, setStatsLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const { showError } = useToast();
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setStatsLoading(true);
      setSubmissionsLoading(true);
      
      // Fetch submissions and dashboard stats in parallel
      const [submissionsResponse, dashboardStatsResponse] = await Promise.all([
        fetch('/api/submissions?page=1&limit=10&sortBy=reviewed_at&sortOrder=desc'),
        fetch('/api/dashboard/approver-stats')
      ]);

      if (!submissionsResponse.ok || !dashboardStatsResponse.ok) {
        throw new Error('Gagal mengambil data dashboard');
      }

      const submissionsData = await submissionsResponse.json();
      const dashboardStats = await dashboardStatsResponse.json();

      setSubmissions((submissionsData.submissions ?? []) as ApproverSubmission[]);
      
      // Use stats directly from dedicated dashboard API
      setStats({
        total: dashboardStats.total || 0,
        pending_approval_meets: dashboardStats.pending_approval_meets || 0,
        pending_approval_not_meets: dashboardStats.pending_approval_not_meets || 0,
        approved: dashboardStats.approved || 0,
        rejected: dashboardStats.rejected || 0,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      showError('Gagal Memuat Dashboard', 'Tidak dapat mengambil data dashboard. Silakan refresh halaman.');
    } finally {
      setStatsLoading(false);
      setSubmissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);



  // Listen to custom events untuk refresh data dashboard
  useEffect(() => {
    const handleDashboardRefresh = () => {
      console.log('🔄 Approver dashboard received refresh event');
      fetchDashboardData();
    };

    window.addEventListener('approver-dashboard-refresh', handleDashboardRefresh);
    
    return () => {
      window.removeEventListener('approver-dashboard-refresh', handleDashboardRefresh);
    };
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

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonDashboardCard />
          <SkeletonDashboardCard />
          <SkeletonDashboardCard />
          <SkeletonDashboardCard />
        </div>
      ) : (
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
      )}

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

        {submissionsLoading ? (
          <SkeletonTable rows={10} cols={6} />
        ) : (
          <ApproverTable
            data={submissions}
            loading={false}
            sortBy="created_at"
            sortOrder="desc"
            onOpenDetail={handleViewDetail}
            emptyTitle="Tidak ada pengajuan"
            emptyDescription="Belum ada pengajuan yang perlu disetujui"
          />
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
