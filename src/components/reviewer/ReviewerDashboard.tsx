'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ReviewerTable, { ReviewerSubmission } from '@/components/reviewer/ReviewerTable';
import ReviewerSubmissionDetailModal from './ReviewerSubmissionDetailModal';
import { useToast } from '@/hooks/useToast';
import { SkeletonDashboardCard, SkeletonTable } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useSocket } from '@/components/common/RealtimeUpdates';
import { cachedFetch, apiCache } from '@/lib/api/client';

interface StatsData {
  pendingReview: number;
  meetsRequirements: number;
  notMeetsRequirements: number;
  total: number;
  pendingUserVerifications?: number;
  totalVerifiedUsers?: number;
}

export default function ReviewerDashboard() {
  const [submissions, setSubmissions] = useState<ReviewerSubmission[]>([]);
  const [stats, setStats] = useState<StatsData>({
    pendingReview: 0,
    meetsRequirements: 0,
    notMeetsRequirements: 0,
    total: 0,
    pendingUserVerifications: 0,
    totalVerifiedUsers: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const { showError } = useToast();

  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Ref untuk debouncing socket events
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      setStatsLoading(true);
      setSubmissionsLoading(true);
      
      // Fetch dengan cache 30 detik
      const [submissionsData, dashboardStats] = await Promise.all([
        cachedFetch<{ submissions: ReviewerSubmission[] }>(
          '/api/submissions?page=1&limit=10&sortBy=created_at&sortOrder=desc',
          { cacheTTL: 30 * 1000 }
        ),
        cachedFetch<{
          submissions: {
            byReviewStatus: { PENDING_REVIEW: number; MEETS_REQUIREMENTS: number; NOT_MEETS_REQUIREMENTS: number };
            total: number;
          };
          users: { pendingVerifications: number; totalVerified: number };
        }>('/api/dashboard/reviewer-stats', { cacheTTL: 30 * 1000 })
      ]);

      setSubmissions((submissionsData.submissions ?? []) as ReviewerSubmission[]);
      
      // Map stats dari API ke format yang diharapkan component
      setStats({
        pendingReview: dashboardStats.submissions?.byReviewStatus?.PENDING_REVIEW || 0,
        meetsRequirements: dashboardStats.submissions?.byReviewStatus?.MEETS_REQUIREMENTS || 0,
        notMeetsRequirements: dashboardStats.submissions?.byReviewStatus?.NOT_MEETS_REQUIREMENTS || 0,
        total: dashboardStats.submissions?.total || 0,
        pendingUserVerifications: dashboardStats.users?.pendingVerifications || 0,
        totalVerifiedUsers: dashboardStats.users?.totalVerified || 0,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      // Hanya tampilkan error toast jika bukan silent refresh (background refresh)
      if (!silent) {
        showError('Gagal Memuat Dashboard', 'Tidak dapat mengambil data dashboard. Silakan refresh halaman.');
      }
    } finally {
      setStatsLoading(false);
      setSubmissionsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.emit('join', { role: 'REVIEWER' });
    
    const refreshData = () => {
      // Debounce refresh untuk menghindari multiple simultaneous calls
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Reviewer dashboard socket refresh triggered');
        // TIDAK invalidate cache - biarkan cachedFetch handle deduplication
        // Silent refresh untuk background updates
        fetchDashboardData(true);
      }, 300); // Debounce 300ms
    };
    
    socket.on('notification:new', refreshData);
    socket.on('stats:update', refreshData);
    socket.on('submission:created', refreshData);
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      socket.off('notification:new', refreshData);
      socket.off('stats:update', refreshData);
      socket.off('submission:created', refreshData);
    };
  }, [socket, fetchDashboardData]);

  // Listen to custom events untuk refresh data dashboard
  useEffect(() => {
    const handleDashboardRefresh = () => {
      console.log('🔄 Reviewer dashboard received refresh event');
      // Invalidate cache hanya untuk specific keys yang perlu di-refresh
      apiCache.invalidatePattern('/api/dashboard/reviewer-stats');
      // Silent refresh untuk custom event
      fetchDashboardData(true);
    };

    window.addEventListener('reviewer-dashboard-refresh', handleDashboardRefresh);
    
    return () => {
      window.removeEventListener('reviewer-dashboard-refresh', handleDashboardRefresh);
    };
  }, [fetchDashboardData]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard Reviewer</h1>
              <p className="text-gray-600 mt-1">
                Kelola review dan verifikasi pengajuan SIMLOK
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <SkeletonDashboardCard />
            <SkeletonDashboardCard />
            <SkeletonDashboardCard />
            <SkeletonDashboardCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Total Pengajuan</h3>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total || 0}</p>
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
                  <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingReview || 0}</p>
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
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.meetsRequirements || 0}</p>
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
                  <p className="text-2xl font-bold text-red-600 mt-1">{stats.notMeetsRequirements || 0}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Verification Stats */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <SkeletonDashboardCard />
            <SkeletonDashboardCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">User Perlu Verifikasi</h3>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {stats.pendingUserVerifications || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">User Terverifikasi</h3>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">
                    {stats.totalVerifiedUsers || 0}
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Submissions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pengajuan Terbaru</h2>
                <p className="text-sm text-gray-500 mt-1">10 pengajuan terakhir untuk persetujuan</p>
              </div>
              <Link
                href="/reviewer/submissions"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Lihat Semua Pengajuan
              </Link>
            </div>
          </div>

          {submissionsLoading ? (
            <SkeletonTable rows={10} cols={6} />
          ) : (
            <ReviewerTable
              mode="dashboard"
              data={submissions}
              loading={false}
              sortBy="created_at"
              sortOrder="desc"
              onOpenDetail={handleViewDetail}
            />
          )}
        </div>
      </div>

      {selectedSubmission && (
        <ReviewerSubmissionDetailModal
          key={selectedSubmission}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          submissionId={selectedSubmission}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
}
