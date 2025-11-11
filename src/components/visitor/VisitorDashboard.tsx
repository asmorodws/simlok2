'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
  QrCodeIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import DashboardStatsCard from '@/components/dashboard/DashboardStatsCard';
import LineChartOne from '@/components/ui/chart/LineChart';
import BarChartOne from '@/components/ui/chart/BarChart';
import { SkeletonChart } from '@/components/ui/skeleton';
import { Badge } from '../ui/Badge';

interface StatsData {
  pendingReview: number;
  meetsRequirements: number;
  notMeetsRequirements: number;
  totalSubmissions: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  totalUsers: number;
  pendingUserVerifications: number;
  totalVerifiedUsers: number;
  totalQrScans: number;
  todayQrScans: number;
}

interface ChartData {
  lineChart: {
    labels: string[];
    series: Array<{
      name: string;
      data: number[];
    }>;
  };
  barChart: {
    labels: string[];
    series: Array<{
      name: string;
      data: number[];
    }>;
  };
}

export default function VisitorDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Fetch chart data separately
  const fetchChartData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/visitor-charts', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChartData(data);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Chart Data Error:', err);
      }
      // Don't set error state for charts - just use fallback data
    }
  }, []);

  // Stable fetch function to prevent infinite re-renders
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    const now = Date.now();
    
    // Prevent rapid successive calls (debounce)
    if (!isRefresh && now - lastFetchTime < 5000) {
      return;
    }
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setLastFetchTime(now);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/dashboard/visitor-stats', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gagal mengambil data: ${errorText || 'Server error'}`);
      }

      const data = await response.json();

      if (!data || typeof data !== 'object') {
        throw new Error('Format response tidak valid');
      }

      const newStats: StatsData = {
        pendingReview: data.submissions?.byReviewStatus?.PENDING_REVIEW || 0,
        meetsRequirements: data.submissions?.byReviewStatus?.MEETS_REQUIREMENTS || 0,
        notMeetsRequirements: data.submissions?.byReviewStatus?.NOT_MEETS_REQUIREMENTS || 0,
        totalSubmissions: data.submissions?.total || 0,
        pendingApproval: data.submissions?.byApprovalStatus?.PENDING || 0,
        approved: data.submissions?.byApprovalStatus?.APPROVED || 0,
        rejected: data.submissions?.byApprovalStatus?.REJECTED || 0,
        totalUsers: data.users?.total || 0,
        pendingUserVerifications: data.users?.pendingVerifications || 0,
        totalVerifiedUsers: data.users?.totalVerified || 0,
        totalQrScans: data.qrScans?.total || 0,
        todayQrScans: data.qrScans?.today || 0,
      };

      setStats(newStats);
    } catch (err) {
      // Only log error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Dashboard Error:', err);
      }
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data dashboard';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lastFetchTime]); // Only depend on lastFetchTime for debouncing

  const handleRefresh = useCallback(() => {
    fetchDashboardData(true);
    fetchChartData();
  }, [fetchDashboardData, fetchChartData]);

  // Single effect to fetch data on mount only
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await fetchDashboardData(false);
        await fetchChartData();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - runs only once on mount

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Gagal Memuat Dashboard</h3>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <ArrowPathIcon className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Memuat...' : 'Coba Lagi'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard Visitor</h1>
              <p className="text-gray-600 mt-1">Monitoring sistem SIMLOK secara real-time</p>
            </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Memuat...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Small Line Chart */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700">Chart SIMLOK</h2>
            <Badge variant='info'>
              2025
            </Badge>
          </div>
          <div className="w-full">
            {loading && !chartData ? (
              <SkeletonChart height="h-80" />
            ) : (
              <LineChartOne 
                {...(chartData?.lineChart.labels && { labels: chartData.lineChart.labels })}
                {...(chartData?.lineChart.series && { series: chartData.lineChart.series })}
              />
            )}
          </div>
        </div>

        {/* Vendor Bar Chart */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700">Chart User</h2>
            <Badge variant='info'>
              2025
            </Badge>
          </div>
          <div className="w-full">
            {loading && !chartData ? (
              <SkeletonChart height="h-80" />
            ) : (
              <BarChartOne 
                {...(chartData?.barChart.labels && { labels: chartData.barChart.labels })}
                {...(chartData?.barChart.series && { series: chartData.barChart.series })}
              />
            )}
          </div>
        </div>

        

        {/* Unified stats grid: show up to 5 cards per row on large screens */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <DashboardStatsCard
            title="Total Submission"
            value={stats?.totalSubmissions || 0}
            icon={DocumentTextIcon}
            color="blue"
            loading={loading && !stats}
          />
          <DashboardStatsCard
            title="Menunggu Review"
            value={stats?.pendingReview || 0}
            icon={ClockIcon}
            color="yellow"
            loading={loading && !stats}
          />
          <DashboardStatsCard
            title="Memenuhi Syarat"
            value={stats?.meetsRequirements || 0}
            icon={CheckCircleIcon}
            color="green"
            loading={loading && !stats}
          />
          <DashboardStatsCard
            title="Tidak Memenuhi Syarat"
            value={stats?.notMeetsRequirements || 0}
            icon={ExclamationTriangleIcon}
            color="red"
            loading={loading && !stats}
          />
          <DashboardStatsCard
            title="Menunggu Persetujuan"
            value={stats?.pendingApproval || 0}
            icon={ClockIcon}
            color="purple"
            loading={loading && !stats}
          />
          <DashboardStatsCard
            title="Disetujui"
            value={stats?.approved || 0}
            icon={CheckCircleIcon}
            color="green"
            loading={loading && !stats}
          />
          <DashboardStatsCard
            title="Ditolak"
            value={stats?.rejected || 0}
            icon={XCircleIcon}
            color="red"
            loading={loading && !stats}
          />
          <DashboardStatsCard
            title="Total QR Scan"
            value={stats?.totalQrScans || 0}
            icon={QrCodeIcon}
            color="blue"
            loading={loading && !stats}
          />
          <DashboardStatsCard
            title="Total User"
            value={stats?.totalUsers || 0}
            icon={UsersIcon}
            color="gray"
            loading={loading && !stats}
          />
          <DashboardStatsCard
            title="User Perlu Verifikasi"
            value={stats?.pendingUserVerifications || 0}
            icon={(props) => (
              <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            )}
            color="purple"
            loading={loading && !stats}
          />
          <DashboardStatsCard
            title="User Terverifikasi"
            value={stats?.totalVerifiedUsers || 0}
            icon={(props) => (
              <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            color="indigo"
            loading={loading && !stats}
          />
        </div>

        {/* End of unified stats grid */}
        
      </div>
    </div>
  );
}