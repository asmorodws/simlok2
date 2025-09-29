'use client';

import { useState, useEffect } from 'react';
import { 
  EyeIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  QrCodeIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/hooks/useToast';
import Button from '../ui/button/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import CameraQRScanner from '../scanner/CameraQRScanner';

interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

interface RecentSubmission {
  id: string;
  vendor_name: string;
  simlok_number?: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  job_description: string;
}

export default function ResponsiveVerifierDashboard() {
  const { showError } = useToast();
  
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0
  });
  
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsResponse, submissionsResponse] = await Promise.all([
        fetch('/api/verifier/stats'),
        fetch('/api/verifier/submissions?limit=5&status=ALL')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        setRecentSubmissions(submissionsData.submissions || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showError('Error', 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleScanResult = async (scannedData: string) => {
    try {
      setScannerOpen(false);
      
      let submissionId = scannedData;
      
      if (scannedData.startsWith('{')) {
        const qrData = JSON.parse(scannedData);
        submissionId = qrData.id || qrData.submissionId;
      }
      
      if (submissionId) {
        window.location.href = `/verifier/submissions/${submissionId}`;
      }
    } catch (error) {
      console.error('Error processing scan result:', error);
      showError('Error', 'QR Code tidak valid');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Dashboard Verifier</h1>
            <p className="text-blue-100">
              Kelola dan verifikasi pengajuan SIMLOK dengan mudah
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setScannerOpen(true)}
              className="bg-white text-blue-600 hover:bg-gray-100 w-full sm:w-auto"
            >
              <QrCodeIcon className="w-4 h-4 mr-2" />
              <span className="sm:hidden">Scan QR Code</span>
              <span className="hidden sm:inline">Scan QR</span>
            </Button>
            
            <Button
              onClick={() => window.location.href = '/verifier/submissions'}
              className="bg-blue-500 hover:bg-blue-400 border-blue-400 w-full sm:w-auto"
            >
              <ClipboardDocumentListIcon className="w-4 h-4 mr-2" />
              <span className="sm:hidden">Lihat Semua SIMLOK</span>
              <span className="hidden sm:inline">Semua SIMLOK</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Submissions */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Submission</h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Menunggu</h3>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <ClockIcon className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Approved */}
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

        {/* Rejected */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Ditolak</h3>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <XCircleIcon className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats - Period Based */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2 text-gray-400" />
            Statistik Periode
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {stats.today}
              </div>
              <div className="text-sm text-gray-600">Hari Ini</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {stats.thisWeek}
              </div>
              <div className="text-sm text-gray-600">Minggu Ini</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {stats.thisMonth}
              </div>
              <div className="text-sm text-gray-600">Bulan Ini</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2 sm:mb-0 flex items-center">
              <CalendarDaysIcon className="w-5 h-5 mr-2 text-gray-400" />
              Submissions Terbaru
            </h3>
            <Button
              onClick={() => window.location.href = '/verifier/submissions'}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Lihat Semua
            </Button>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Belum ada submissions
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Submissions baru akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                      <div className="flex-shrink-0">
                        {getStatusBadge(submission.approval_status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {submission.simlok_number || 'Belum ada nomor'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {submission.vendor_name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="sm:hidden mt-2">
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {submission.job_description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(submission.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:block text-right mr-4">
                    <p className="text-sm text-gray-500 max-w-xs truncate">
                      {submission.job_description}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(submission.created_at)}
                    </p>
                  </div>

                  <div className="mt-3 sm:mt-0 sm:ml-4">
                    <Button
                      onClick={() => window.location.href = `/verifier/submissions/${submission.id}`}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      <span className="sm:hidden">Lihat Detail</span>
                      <span className="hidden sm:inline">Detail</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Scanner */}
      {scannerOpen && (
        <CameraQRScanner
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleScanResult}
          title="Scan QR Code SIMLOK"
          description="Arahkan kamera ke QR code SIMLOK untuk memverifikasi"
        />
      )}
    </div>
  );
}