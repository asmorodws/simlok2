'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  UsersIcon,
  QrCodeIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

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



export default function VisitorDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

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
  }, [fetchDashboardData]);

  // Single effect to fetch data on mount only
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await fetchDashboardData(false);
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
              <p className="text-gray-600 mt-1">
                Monitoring sistem SIMLOK secara real-time
              </p>
            </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <div className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                <EyeIcon className="w-4 h-4 mr-2" />
                Mode Baca Saja
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Memuat...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards - Sama seperti Reviewer Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Submission</h3>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.totalSubmissions || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DocumentTextIcon className="w-6 h-6 text-blue-600" />
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

        {/* Approval Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Menunggu Persetujuan</h3>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats?.pendingApproval || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <ClockIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Disetujui</h3>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats?.approved || 0}</p>
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
                <p className="text-2xl font-bold text-red-600 mt-1">{stats?.rejected || 0}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircleIcon className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* User Verification Stats - Sama seperti Reviewer Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">User Perlu Verifikasi</h3>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {stats?.pendingUserVerifications || 0}
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
                  {stats?.totalVerifiedUsers || 0}
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

        {/* Additional Stats - QR Scans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total QR Scan</h3>
                <p className="text-2xl font-bold text-cyan-600 mt-1">{stats?.totalQrScans || 0}</p>
              </div>
              <div className="p-3 bg-cyan-100 rounded-full">
                <QrCodeIcon className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total User</h3>
                <p className="text-2xl font-bold text-slate-600 mt-1">{stats?.totalUsers || 0}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-full">
                <UsersIcon className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}