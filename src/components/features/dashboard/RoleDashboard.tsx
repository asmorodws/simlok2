'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  QrCodeIcon,
  UsersIcon,
  DocumentTextIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useToast } from '@/hooks/useToast';
import { SkeletonDashboardCard, SkeletonTable, SkeletonChart } from '@/components/ui/loading';
import Card from '@/components/ui/card/Card';
import Button from '@/components/ui/button/Button';
import UnifiedSubmissionTable from '@/components/features/submission/UnifiedSubmissionTable';
import { ApproverTableSkeleton, ReviewerTableSkeleton } from '@/components/ui/loading';
import { SubmissionsTable } from '@/components/features/submission/SubmissionTable';
import SubmissionsCardView from '@/components/features/submission/SubmissionsCardView';
import { Badge } from '@/components/ui/badge/Badge';
import LineChartOne from '@/components/ui/chart/LineChart';
import BarChartOne from '@/components/ui/chart/BarChart';
import CameraQRScanner from '@/components/features/qr-scan/CameraQRScanner';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import StatCard from '@/components/ui/card/StatCard';
import { useStatsStore } from '@/store/useStatsStore';
import { useSubmissionStore } from '@/store/useSubmissionStore';

// Import unified modal
import { UnifiedSubmissionDetailModal } from '@/components/features/submission';
import ScanDetailModal from '@/components/features/qr-scan/ScanDetailModal';
import type { QrScan, ApproverSubmission, ReviewerSubmission } from '@/types';

type UserRole = 'APPROVER' | 'REVIEWER' | 'VENDOR' | 'VERIFIER' | 'VISITOR';

interface RoleDashboardProps {
  role: UserRole;
}

// Unified submission types
export default function RoleDashboard({ role }: RoleDashboardProps) {
  const { data: session } = useSession();
  const { showError, showSuccess } = useToast();

  // Common states
  const [statsLoading, setStatsLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Role-specific states
  const [approverStats, setApproverStats] = useState({ total: 0, pending_approval_meets: 0, approved: 0, rejected: 0 });
  const [approverSubmissions, setApproverSubmissions] = useState<ApproverSubmission[]>([]);

  const [reviewerStats, setReviewerStats] = useState({ 
    pendingReview: 0, meetsRequirements: 0, notMeetsRequirements: 0, total: 0,
    pendingUserVerifications: 0, totalVerifiedUsers: 0 
  });
  const [reviewerSubmissions, setReviewerSubmissions] = useState<ReviewerSubmission[]>([]);

  // Vendor uses Zustand stores
  const { vendorStats, fetchVendorStats } = useStatsStore();
  const { submissions: vendorSubmissions, loading: vendorSubmissionsLoading, fetchVendorSubmissions, deleteSubmission } = useSubmissionStore();
  
  const [verifierStats, setVerifierStats] = useState({ totalScans: 0, todayScans: 0, totalSubmissions: 0, approvedSubmissions: 0 });
  const [recentScans, setRecentScans] = useState<QrScan[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<QrScan | null>(null);

  const [visitorStats, setVisitorStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);

  const [confirmModal, setConfirmModal] = useState({
    show: false, title: "", message: "", onConfirm: () => {}, isLoading: false,
  });

  // Fetch data based on role
  const fetchDashboardData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setStatsLoading(true);
      setSubmissionsLoading(true);
    }

    try {
      if (role === 'APPROVER') {
        const [submissionsResponse, dashboardStatsResponse] = await Promise.all([
          fetch('/api/submissions?page=1&limit=10&sortBy=reviewed_at&sortOrder=desc'),
          fetch('/api/dashboard/stats')
        ]);

        if (submissionsResponse.ok && dashboardStatsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          const dashboardStats = await dashboardStatsResponse.json();
          setApproverSubmissions((submissionsData.submissions ?? []) as ApproverSubmission[]);
          setApproverStats({
            total: dashboardStats.total || 0,
            pending_approval_meets: dashboardStats.pending_approval_meets || 0,
            approved: dashboardStats.approved || 0,
            rejected: dashboardStats.rejected || 0,
          });
        }
      } else if (role === 'REVIEWER') {
        const [submissionsResponse, dashboardStatsResponse] = await Promise.all([
          fetch('/api/submissions?page=1&limit=10&sortBy=created_at&sortOrder=desc'),
          fetch('/api/dashboard/stats')
        ]);

        if (submissionsResponse.ok && dashboardStatsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          const dashboardStats = await dashboardStatsResponse.json();
          setReviewerSubmissions((submissionsData.submissions ?? []) as ReviewerSubmission[]);
          setReviewerStats({
            pendingReview: dashboardStats.submissions?.byReviewStatus?.PENDING_REVIEW || 0,
            meetsRequirements: dashboardStats.submissions?.byReviewStatus?.MEETS_REQUIREMENTS || 0,
            notMeetsRequirements: dashboardStats.submissions?.byReviewStatus?.NOT_MEETS_REQUIREMENTS || 0,
            total: dashboardStats.submissions?.total || 0,
            pendingUserVerifications: dashboardStats.users?.pendingVerifications || 0,
            totalVerifiedUsers: dashboardStats.users?.totalVerified || 0,
          });
        }
      } else if (role === 'VENDOR') {
        if (session?.user?.id) {
          await Promise.all([fetchVendorStats(), fetchVendorSubmissions()]);
        }
      } else if (role === 'VERIFIER') {
        const [scansRes, statsRes] = await Promise.all([
          fetch('/api/qr/verify?limit=5&offset=0&search='),
          fetch('/api/dashboard/stats')
        ]);

        if (scansRes.ok) {
          const scanData = await scansRes.json();
          setRecentScans(scanData.scans || []);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setVerifierStats(statsData);
        }
      } else if (role === 'VISITOR') {
        const response = await fetch('/api/dashboard/stats', {
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });

        if (response.ok) {
          const data = await response.json();
          setVisitorStats({
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
          });
        }

        // Fetch chart data
        const chartsResponse = await fetch('/api/dashboard/visitor-charts');
        if (chartsResponse.ok) {
          const chartsData = await chartsResponse.json();
          setChartData(chartsData);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      showError('Gagal Memuat Dashboard', 'Tidak dapat mengambil data dashboard. Silakan refresh halaman.');
    } finally {
      setStatsLoading(false);
      setSubmissionsLoading(false);
    }
  }, [role, session?.user?.id, showError]);
  // Note: fetchVendorStats dan fetchVendorSubmissions tidak dimasukkan ke dependency array
  // karena mereka adalah fungsi dari Zustand store yang sudah stabil dan tidak berubah

  // Initial data fetch on mount
  useEffect(() => {
    fetchDashboardData();
  }, []); // Empty deps - fetch only once on mount

  // Custom event listeners
  useEffect(() => {
    const eventName = `${role.toLowerCase()}-dashboard-refresh`;
    const handleRefresh = () => fetchDashboardData();
    window.addEventListener(eventName, handleRefresh);
    return () => window.removeEventListener(eventName, handleRefresh);
  }, [role]); // fetchDashboardData removed to prevent infinite loop

  // Handlers
  const handleViewDetail = (submissionId: string | { id: string }) => {
    const id = typeof submissionId === 'string' ? submissionId : submissionId.id;
    
    if (role === 'VENDOR') {
      const fullSubmission = vendorSubmissions.find(s => s.id === id);
      if (fullSubmission) {
        setSelectedSubmission(id);
        setIsModalOpen(true);
      }
    } else {
      setSelectedSubmission(id);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
  };

  const handleActionSubmitted = () => {
    fetchDashboardData();
    handleCloseModal();
  };

  const handleDelete = useCallback(async (id: string) => {
    const submission = vendorSubmissions.find(s => s.id === id);
    setConfirmModal({
      show: true,
      title: "Konfirmasi Hapus",
      message: `Apakah Anda yakin ingin menghapus pengajuan "${submission?.job_description}"?`,
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, isLoading: true }));
          await deleteSubmission(id);
          showSuccess("Berhasil", "Pengajuan berhasil dihapus");
          setConfirmModal({ show: false, title: "", message: "", onConfirm: () => {}, isLoading: false });
          fetchVendorSubmissions();
        } catch (error) {
          showError("Error", "Gagal menghapus pengajuan");
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false,
    });
  }, [vendorSubmissions, deleteSubmission, showSuccess, showError]); // fetchVendorSubmissions removed - it's a stable Zustand function

  const handleEdit = (id: string) => {
    window.location.href = `/vendor/submissions/edit/${id}`;
  };

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  // Render stats cards based on role
  const renderStatsCards = () => {
    if (statsLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonDashboardCard key={i} />)}
        </div>
      );
    }

    if (role === 'APPROVER') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Pengajuan"
            value={approverStats.total}
            icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
            accent="blue"
          />
          <StatCard
            title="Menunggu Persetujuan"
            value={approverStats.pending_approval_meets}
            icon={<ClockIcon className="w-6 h-6" />}
            accent="amber"
          />
          <StatCard
            title="Disetujui"
            value={approverStats.approved}
            icon={<CheckCircleIcon className="w-6 h-6" />}
            accent="green"
          />
          <StatCard
            title="Ditolak"
            value={approverStats.rejected}
            icon={<XCircleIcon className="w-6 h-6" />}
            accent="red"
          />
        </div>
      );
    }

    if (role === 'REVIEWER') {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Pengajuan"
              value={reviewerStats.total}
              icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
              accent="blue"
            />
            <StatCard
              title="Menunggu Review"
              value={reviewerStats.pendingReview}
              icon={<ClockIcon className="w-6 h-6" />}
              accent="amber"
            />
            <StatCard
              title="Memenuhi Syarat"
              value={reviewerStats.meetsRequirements}
              icon={<CheckCircleIcon className="w-6 h-6" />}
              accent="green"
            />
            <StatCard
              title="Tidak Memenuhi Syarat"
              value={reviewerStats.notMeetsRequirements}
              icon={<ExclamationTriangleIcon className="w-6 h-6" />}
              accent="red"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              title="User Perlu Verifikasi"
              value={reviewerStats.pendingUserVerifications}
              icon={<UsersIcon className="w-6 h-6" />}
              accent="purple"
            />
            <StatCard
              title="User Terverifikasi"
              value={reviewerStats.totalVerifiedUsers}
              icon={<CheckCircleIcon className="w-6 h-6" />}
              accent="indigo"
            />
          </div>
        </>
      );
    }

    if (role === 'VENDOR') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Disetujui"
            value={vendorStats?.totalApproved || 0}
            icon={<CheckCircleIcon className="w-6 h-6" />}
            accent="green"
          />
          <StatCard
            title="Total Menunggu"
            value={vendorStats?.totalPending || 0}
            icon={<ClockIcon className="w-6 h-6" />}
            accent="amber"
          />
          <StatCard
            title="Total Ditolak"
            value={vendorStats?.totalRejected || 0}
            icon={<XCircleIcon className="w-6 h-6" />}
            accent="red"
          />
        </div>
      );
    }

    if (role === 'VERIFIER') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Scan"
            value={verifierStats.totalScans}
            icon={<QrCodeIcon className="w-6 h-6" />}
            accent="blue"
          />
          <StatCard
            title="Scan Hari Ini"
            value={verifierStats.todayScans}
            icon={<QrCodeIcon className="w-6 h-6" />}
            accent="green"
          />
          <StatCard
            title="Total Pengajuan"
            value={verifierStats.totalSubmissions}
            icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
            accent="purple"
          />
          <StatCard
            title="Disetujui"
            value={verifierStats.approvedSubmissions}
            icon={<CheckCircleIcon className="w-6 h-6" />}
            accent="amber"
          />
        </div>
      );
    }

    if (role === 'VISITOR' && visitorStats) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Pengajuan"
            value={visitorStats.totalSubmissions}
            icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
            accent="blue"
          />
          <StatCard
            title="Disetujui"
            value={visitorStats.approved}
            icon={<CheckCircleIcon className="w-6 h-6" />}
            accent="green"
          />
          <StatCard
            title="Total User"
            value={visitorStats.totalUsers}
            icon={<UsersIcon className="w-6 h-6" />}
            accent="purple"
          />
          <StatCard
            title="Total Scan QR"
            value={visitorStats.totalQrScans}
            icon={<QrCodeIcon className="w-6 h-6" />}
            accent="amber"
          />
        </div>
      );
    }

    return null;
  };

  // Render submissions table/content based on role
  const renderContent = () => {
    if (role === 'APPROVER' || role === 'REVIEWER') {
      return (
        <Card className="rounded-xl border shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pengajuan Terbaru</h2>
                <p className="text-sm text-gray-500 mt-1">10 pengajuan terakhir untuk persetujuan</p>
              </div>
              <Link
                href={`/${role.toLowerCase()}/submissions`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Lihat Semua Pengajuan
              </Link>
            </div>
          </div>

          {submissionsLoading ? (
            <SkeletonTable rows={10} columns={6} />
          ) : (
            <UnifiedSubmissionTable
              data={role === 'APPROVER' ? approverSubmissions : reviewerSubmissions}
              loading={false}
              sortBy={role === 'APPROVER' ? 'reviewed_at' : 'created_at'}
              sortOrder="desc"
              onOpenDetail={handleViewDetail}
              showScanColumn={role === 'REVIEWER'}
              actionLabelPending="Review"
              actionLabelCompleted="Lihat"
              pendingCondition={(submission: any) =>
                role === 'APPROVER'
                  ? submission.approval_status === 'PENDING_APPROVAL'
                  : submission.review_status === 'PENDING_REVIEW'
              }
              SkeletonComponent={role === 'APPROVER' ? ApproverTableSkeleton : ReviewerTableSkeleton}
            />
          )}
        </Card>
      );
    }

    if (role === 'VENDOR') {
      return (
        <Card className="rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pengajuan Terbaru</h3>
                <p className="text-sm text-gray-600 mt-1">Menampilkan 10 pengajuan terakhir Anda</p>
              </div>
              <Link 
                href="/vendor/submissions" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Lihat Semua Pengajuan
              </Link>
            </div>
          </div>

          {vendorSubmissionsLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} columns={6} />
            </div>
          ) : vendorSubmissions.length === 0 ? (
            <div className="p-12 text-center">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Belum ada pengajuan</h3>
              <p className="mt-2 text-sm text-gray-600">
                Mulai dengan membuat pengajuan SIMLOK pertama Anda
              </p>
              <Link href="/vendor/submissions/create" className="mt-4 inline-block">
                <Button variant="primary">
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Buat Pengajuan Pertama
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden sm:block">
                <SubmissionsTable
                  submissions={vendorSubmissions.slice(0, 10).map((s: any) => ({
                    id: s.id,
                    job_description: s.job_description,
                    officer_name: s.officer_name,
                    vendor_name: s.vendor_name || s.user_vendor_name,
                    work_location: s.work_location,
                    work_hours: s.working_hours ?? "",
                    approval_status: s.approval_status,
                    review_status: s.review_status ?? 'PENDING_REVIEW',
                    simlok_number: s.simlok_number ?? "",
                    created_at: s.created_at,
                  }))}
                  loading={false}
                  onView={handleViewDetail}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  formatDate={formatDate}
                />
              </div>
              <div className="block sm:hidden p-4">
                <SubmissionsCardView
                  submissions={vendorSubmissions.slice(0, 10).map((s: any) => ({
                    id: s.id,
                    job_description: s.job_description,
                    officer_name: s.officer_name,
                    vendor_name: s.vendor_name || s.user_vendor_name,
                    work_location: s.work_location,
                    work_hours: s.working_hours ?? "",
                    approval_status: s.approval_status,
                    review_status: s.review_status ?? 'PENDING_REVIEW',
                    simlok_number: s.simlok_number ?? "",
                    created_at: s.created_at,
                  }))}
                  loading={false}
                  onView={handleViewDetail}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  formatDate={formatDate}
                />
              </div>
            </>
          )}
        </Card>
      );
    }

    if (role === 'VERIFIER') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Scan QR Terbaru</h3>
              <Button variant="primary" size="sm" onClick={() => setScannerOpen(true)}>
                <QrCodeIcon className="w-5 h-5 mr-2" />
                Scan QR
              </Button>
            </div>
            {statsLoading ? (
              <SkeletonTable rows={5} columns={3} />
            ) : (
              <div className="space-y-3">
                {recentScans.map((scan) => (
                  <div key={scan.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedScan(scan)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{scan.submission.simlok_number || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{scan.submission.vendor_name}</p>
                      </div>
                      <Badge variant="success">Berhasil</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(scan.scanned_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      );
    }

    if (role === 'VISITOR' && chartData) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Pengajuan</h3>
            {statsLoading ? <SkeletonChart /> : chartData?.lineChart && <LineChartOne {...chartData.lineChart} />}
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Pengajuan</h3>
            {statsLoading ? <SkeletonChart /> : chartData?.barChart && <BarChartOne {...chartData.barChart} />}
          </Card>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={role === 'REVIEWER' ? "min-h-screen bg-gray-50" : "space-y-6"}>
      {role === 'REVIEWER' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard Reviewer</h1>
            <p className="text-gray-600 mt-1">Kelola review dan verifikasi pengajuan SIMLOK</p>
          </div>
        </div>
      )}

      {role === 'VENDOR' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Selamat datang, {session?.user.officer_name ?? "Vendor"}
              </h1>
              <p className="text-gray-600 mt-1">
                {session?.user.vendor_name && `${session.user.vendor_name} - `} Kelola pengajuan SIMLOK Anda
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link href="/vendor/submissions/create">
                <Button variant="primary" size="md">
                  <PlusIcon className="w-5 h-5 mr-2" /> Buat pengajuan
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className={role === 'REVIEWER' ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6" : "space-y-6"}>
        {renderStatsCards()}
        {renderContent()}
      </div>

      {/* Unified Submission Detail Modal */}
      {selectedSubmission && (role === 'APPROVER' || role === 'REVIEWER' || role === 'VENDOR') && (
        <UnifiedSubmissionDetailModal
          submissionId={selectedSubmission}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          userRole={role}
          onSuccess={handleActionSubmitted}
        />
      )}

      {role === 'VENDOR' && confirmModal.show && (
        <ConfirmModal
          isOpen={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(prev => ({ ...prev, show: false }))}
          isLoading={confirmModal.isLoading}
          confirmText="Hapus"
          cancelText="Batal"
          variant="danger"
        />
      )}

      {role === 'VERIFIER' && scannerOpen && (
        <CameraQRScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />
      )}

      {role === 'VERIFIER' && selectedScan && (
        <ScanDetailModal
          scan={selectedScan as any}
          isOpen={!!selectedScan}
          onClose={() => setSelectedScan(null)}
        />
      )}
    </div>
  );
}
