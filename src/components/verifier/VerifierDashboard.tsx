'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  QrCodeIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UserIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  UsersIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  XMarkIcon,
  DocumentCheckIcon,
  CameraIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '@/hooks/useToast';
import Button from '../ui/button/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonDashboardCard, SkeletonCard } from '@/components/ui/skeleton';
import CameraQRScanner from '../scanner/CameraQRScanner';
import ScanDetailModal from '@/components/common/ScanDetailModal';
import SimlokPdfModal from '@/components/common/SimlokPdfModal';

interface SubmissionData {
  id: string;
  vendor_name: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation: string;
  approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  simlok_number?: string;
  simlok_date?: string;
  created_at: string;
  working_hours?: string;
  worker_count?: number;
  implementation_start_date?: string;
  implementation_end_date?: string;
  simja_number?: string;
  sika_number?: string;
}

interface QrScan {
  id: string;
  submission_id: string;
  scanned_by: string;
  scanned_at: string;
  scanner_name: string;
  scan_location?: string;
  notes?: string;
  submission: {
    id: string;
    simlok_number?: string;
    vendor_name: string;
    officer_name: string;
    job_description: string;
    work_location: string;
    approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    working_hours?: string;
    implementation?: string;
    simja_number?: string;
    sika_number?: string;
    worker_count?: number;
    implementation_start_date?: string;
    implementation_end_date?: string;
    created_at?: string;
  };
}

export default function VerifierDashboard() {
  const { showError } = useToast();
  
  const [recentScans, setRecentScans] = useState<QrScan[]>([]);
  const [stats, setStats] = useState({
    totalScans: 0,
    todayScans: 0,
    totalSubmissions: 0,
    approvedSubmissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionData | null>(null);
  const [selectedScan, setSelectedScan] = useState<QrScan | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const scanHistoryRef = useRef<{ closeDetailModal: () => void } | null>(null);

  const fetchDashboardData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      // Fetch stats, recent submissions, and recent scans in parallel
      const [submissionsRes, scansRes, statsRes] = await Promise.all([
        fetch('/api/submissions?limit=5&page=1&status=APPROVED'),
        fetch('/api/qr/verify?limit=5&offset=0&search='),
        fetch('/api/verifier/stats')
      ]);

      if (submissionsRes.ok) {
        await submissionsRes.json();
        // Data submissions tersimpan tapi tidak ditampilkan di dashboard
      }

      if (scansRes.ok) {
        const scanData = await scansRes.json();
        setRecentScans(scanData.scans || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showError('Error', 'Gagal memuat data dashboard');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Custom event listener for refreshing dashboard after QR scan
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout | null = null;
    
    const handleVerifierScanRefresh = () => {
      console.log('Verifier scan refresh event received, scheduling dashboard data refresh...');
      
      // Clear any existing timeout to debounce multiple refresh calls
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      
      // Refresh data without loading state to avoid modal interference
      refreshTimeout = setTimeout(() => {
        console.log('Executing dashboard data refresh (silent)...');
        fetchDashboardData(false); // false = no loading state, just update data
      }, 150); // Reduced delay since no loading state
    };

    window.addEventListener('verifier-scan-refresh', handleVerifierScanRefresh);

    return () => {
      window.removeEventListener('verifier-scan-refresh', handleVerifierScanRefresh);
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="warning">
            <ClockIcon className="w-3 h-3 mr-1" />
            Menunggu
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="success">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Disetujui
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircleIcon className="w-3 h-3 mr-1" />
            Ditolak
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-72" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonDashboardCard />
          <SkeletonDashboardCard />
          <SkeletonDashboardCard />
          <SkeletonDashboardCard />
        </div>

        {/* Quick Scan Actions */}
        <SkeletonCard className="h-48" />

        {/* Recent Scans */}
        <SkeletonCard className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard Verifikator</h1>
            <p className="text-gray-600 mt-1">
              Kelola verifikasi dan scan QR Code SIMLOK
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Scan QR</h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalScans}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <QrCodeIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Scan Hari Ini</h3>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.todayScans}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CalendarDaysIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Submission</h3>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalSubmissions}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DocumentTextIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Disetujui</h3>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.approvedSubmissions}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <DocumentCheckIcon className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Scan Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Barcode & QR Code Scanner
          </h2>
          <p className="text-gray-600 mb-6">
            Scan barcode atau QR code SIMLOK untuk verifikasi. Scanner mendukung berbagai format: QR Code, Code 128, Code 39, EAN, UPC. Pastikan browser mengizinkan akses kamera.
          </p>
          
          <div className="flex justify-center">
            <Button
              onClick={() => {
                console.log('Opening barcode scanner from verifier dashboard');
                // Close any open detail modals from scan history
                if (scanHistoryRef.current?.closeDetailModal) {
                  scanHistoryRef.current.closeDetailModal();
                }
                setScannerOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <CameraIcon className="w-6 h-6 mr-2" />
              Mulai Scan Barcode/QR Code
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Scan QR Terbaru</h3>
              <p className="text-sm text-gray-500">5 scan terakhir yang telah dilakukan</p>
            </div>
            <Button
              onClick={() => window.location.href = '/verifier/history'}
              variant="outline"
              size="sm"
            >
              Lihat Semua
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
        
        {recentScans.length === 0 ? (
          <div className="text-center py-12">
            <QrCodeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Belum ada scan
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Belum ada QR code yang di-scan hari ini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentScans.map((scan) => (
              <div key={scan.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <QrCodeIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">
                            {scan.submission.simlok_number || 'Belum ada nomor'}
                          </p>
                          {getStatusBadge(scan.submission.approval_status)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {scan.submission.vendor_name} • {scan.submission.officer_name}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span className="flex items-center">
                            <CalendarDaysIcon className="w-3 h-3 mr-1" />
                            {format(new Date(scan.scanned_at), 'dd MMM yyyy HH:mm', { locale: id })}
                          </span>
                          {scan.scan_location && (
                            <span className="flex items-center">
                              <MapPinIcon className="w-3 h-3 mr-1" />
                              {scan.scan_location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedScan(scan)}
                    variant="outline"
                    size="sm"
                  >
                    <EyeIcon className="w-4 h-4 mr-1" />
                    Detail
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Scan Detail Modal */}
      <ScanDetailModal
        isOpen={!!selectedScan}
        onClose={() => setSelectedScan(null)}
        scan={selectedScan}
        onViewPdf={() => setIsPdfModalOpen(true)}
        showPdfButton={true}
        title="Detail Scan QR Code"
      />

      {/* Enhanced Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <DocumentTextIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Detail Submission</h3>
                    <p className="text-purple-100 text-sm">
                      {selectedSubmission.simlok_number || 'Informasi Pengajuan'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Status Banner */}
              <div className="mb-6">
                {selectedSubmission.approval_status === 'PENDING_APPROVAL' && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ClockIcon className="w-5 h-5 text-yellow-600 mr-2" />
                      <span className="font-semibold text-yellow-800">Status: Menunggu Persetujuan</span>
                    </div>
                  </div>
                )}
                {selectedSubmission.approval_status === 'APPROVED' && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                      <span className="font-semibold text-green-800">Status: Telah Disetujui</span>
                    </div>
                  </div>
                )}
                {selectedSubmission.approval_status === 'REJECTED' && (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg">
                    <div className="flex items-center">
                      <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                      <span className="font-semibold text-red-800">Status: Ditolak</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submission Information */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-purple-100 rounded-xl mr-4">
                    <DocumentTextIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-800">Informasi Pengajuan SIMLOK</h4>
                    <p className="text-sm text-gray-500">Detail lengkap pengajuan submission</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <QrCodeIcon className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-600">Nomor SIMLOK</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {selectedSubmission.simlok_number || 'Belum ada nomor'}
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <BuildingOfficeIcon className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-600">Perusahaan</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedSubmission.vendor_name}
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <UserIcon className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-600">Petugas PIC</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedSubmission.officer_name}
                      </p>
                    </div>

                    {selectedSubmission.worker_count && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <UsersIcon className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-gray-600">Jumlah Pekerja</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {selectedSubmission.worker_count} orang
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <BriefcaseIcon className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-600">Deskripsi Pekerjaan</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedSubmission.job_description}
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPinIcon className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-600">Lokasi Kerja</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedSubmission.work_location}
                      </p>
                    </div>

                    {selectedSubmission.working_hours && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <ClockIcon className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-gray-600">Jam Kerja</span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {selectedSubmission.working_hours}
                        </p>
                      </div>
                    )}

                    {(selectedSubmission.implementation_start_date || selectedSubmission.implementation_end_date) && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <CalendarDaysIcon className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-gray-600">Periode Pelaksanaan</span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {selectedSubmission.implementation_start_date && 
                            format(new Date(selectedSubmission.implementation_start_date), 'dd MMM yyyy', { locale: id })}
                          {selectedSubmission.implementation_start_date && selectedSubmission.implementation_end_date && ' - '}
                          {selectedSubmission.implementation_end_date && 
                            format(new Date(selectedSubmission.implementation_end_date), 'dd MMM yyyy', { locale: id })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Numbers */}
                {(selectedSubmission.simja_number || selectedSubmission.sika_number) && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Nomor Dokumen Pendukung</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedSubmission.simja_number && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <span className="text-xs font-medium text-blue-600">SIMJA</span>
                          <p className="text-sm font-semibold text-blue-900 mt-1">
                            {selectedSubmission.simja_number}
                          </p>
                        </div>
                      )}
                      {selectedSubmission.sika_number && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <span className="text-xs font-medium text-green-600">SIKA</span>
                          <p className="text-sm font-semibold text-green-900 mt-1">
                            {selectedSubmission.sika_number}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-6"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode & QR Code Scanner Modal */}
      <CameraQRScanner
        isOpen={scannerOpen}
        onClose={() => {
          console.log('Closing barcode scanner from verifier dashboard');
          setScannerOpen(false);
        }}
        onScan={(result: string) => {
          console.log('Barcode/QR Scanned in verifier:', result);
          // Scanner will handle the verification automatically
          // Let the scanner show success modal first before closing
        }}
        title="Scan Barcode/QR Code SIMLOK"
        description="Arahkan kamera ke barcode atau QR code SIMLOK untuk memverifikasi"
      />

      {/* PDF Modal */}
      {selectedScan && (
        <SimlokPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          submissionId={selectedScan.submission_id}
          submissionName={selectedScan.submission.vendor_name || ''}
          nomorSimlok={selectedScan.submission.simlok_number || ''}
        />
      )}
    </div>
  );
}