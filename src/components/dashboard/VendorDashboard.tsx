"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  EyeIcon
} from "@heroicons/react/24/outline";
import Card from "../ui/Card";
import { Badge } from "../ui/Badge";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import ConfirmModal from "../ui/modal/ConfirmModal";
import SubmissionDetailModal from "../vendor/SubmissionDetailModal";

interface VendorStats {
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
}

interface VendorSubmission {
  id: string;
  pekerjaan: string;
  lokasi_kerja: string;
  status_approval_admin: string;
  nomor_simlok?: string;
  created_at: string;
  pelaksanaan: string | null;
  nama_vendor: string;
  berdasarkan: string;
  nama_petugas: string;
  jam_kerja: string;
  lain_lain?: string;
  sarana_kerja: string;
  tembusan?: string;
  nomor_simja?: string;
  tanggal_simja?: string | null;
  nomor_sika?: string;
  tanggal_sika?: string | null;
  tanggal_simlok?: string | null;
  nama_pekerja: string;
  content: string;
  keterangan?: string;
  upload_doc_sika?: string;
  upload_doc_simja?: string;
  upload_doc_id_card?: string;
  qrcode?: string;
  user: {
    id: string;
    nama_petugas: string;
    email: string;
    nama_vendor: string;
  };
  approvedByUser?: {
    id: string;
    nama_petugas: string;
    email: string;
  };
}

export default function VendorDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<VendorStats>({
    totalApproved: 0,
    totalPending: 0,
    totalRejected: 0
  });
  const [submissions, setSubmissions] = useState<VendorSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState<VendorSubmission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Alert state
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    show: false,
    variant: 'info',
    title: '',
    message: ''
  });

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isLoading: boolean;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isLoading: false
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch vendor statistics and submissions
      const [statsRes, submissionsRes] = await Promise.all([
        fetch('/api/vendor/dashboard-stats'),
        fetch('/api/vendor/latest-submissions')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json();
        setSubmissions(submissionsData.submissions || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="warning">Menunggu</Badge>;
      case 'APPROVED': return <Badge variant="success">Disetujui</Badge>;
      case 'REJECTED': return <Badge variant="destructive">Ditolak</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const handleDelete = useCallback((id: string) => {
    setConfirmModal({
      show: true,
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus pengajuan ini? Tindakan ini tidak dapat dibatalkan.',
      onConfirm: () => performDelete(id),
      isLoading: false
    });
  }, []);

  const performDelete = async (id: string) => {
    try {
      setConfirmModal(prev => ({ ...prev, isLoading: true }));

      const response = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menghapus pengajuan');
      }

      // Close confirm modal
      setConfirmModal(prev => ({ ...prev, show: false, isLoading: false }));

      // Refresh data setelah berhasil menghapus
      await fetchDashboardData();
      
      // Show success message
      setAlert({
        show: true,
        variant: 'success',
        title: 'Berhasil!',
        message: 'Pengajuan berhasil dihapus'
      });
      
      // Auto hide after 3 seconds
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    } catch (error) {
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
      
      console.error('Error deleting submission:', error);
      setAlert({
        show: true,
        variant: 'error',
        title: 'Gagal Menghapus',
        message: error instanceof Error ? error.message : 'Gagal menghapus pengajuan'
      });
      
      // Auto hide after 5 seconds
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);
    }
  };

  const handleViewDetail = useCallback((submission: VendorSubmission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
  }, []);

  return (
    <div className="space-y-8">
      {/* Alert Notification */}
      {alert.show && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
          />
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Selamat datang di dashboard vendor, {session?.user.nama_petugas ?? session?.user.name ?? "Vendor"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {session?.user.nama_vendor && `${session.user.nama_vendor} - `}
              Kelola pengajuan SIMLOK Anda
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link href="/vendor/submissions/create">
              <Button variant="primary" size="md">
                <PlusIcon className="w-5 h-5 mr-2" />
                Buat pengajuan
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Disetujui</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {loading ? '...' : stats.totalApproved}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Menunggu</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                {loading ? '...' : stats.totalPending}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Ditolak</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                {loading ? '...' : stats.totalRejected}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
              <XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Submissions Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pengajuan Terbaru</h3>
          <Link href="/vendor/submissions" className="text-sm text-blue-600 hover:text-blue-500">
            Lihat Semua
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pekerjaan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Lokasi Kerja
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  No. SIMLOK
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <div className="text-center">
                      <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Belum ada pengajuan</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Mulai dengan membuat pengajuan SIMLOK pertama Anda
                      </p>
                      <Link href="/vendor/submissions/create" className="mt-4 inline-block">
                        <Button variant="primary" size="sm">
                          <PlusIcon className="w-4 h-4 mr-2" />
                          Buat Pengajuan Pertama
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="max-w-xs truncate" title={submission.pekerjaan}>
                        {submission.pekerjaan}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="max-w-xs truncate" title={submission.lokasi_kerja}>
                        {submission.lokasi_kerja}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(submission.status_approval_admin)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {submission.nomor_simlok || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(submission.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleViewDetail(submission)}
                          variant="info"
                          size="sm"
                          title="Lihat Detail"
                        >
                          Lihat
                        </Button>
                        {submission.status_approval_admin === 'PENDING' && (
                          <>
                            <Link href={`/vendor/submissions/edit/${submission.id}`}>
                              <Button
                                variant="warning"
                                size="sm"
                                title="Ubah Pengajuan"
                                className="mr-2"
                              >
                                Ubah
                              </Button>
                            </Link>
                            <Button
                              onClick={() => handleDelete(submission.id)}
                              variant="destructive"
                              size="sm"
                              title="Hapus Pengajuan"
                            >
                              Hapus
                            </Button>
                          </>
                        )}
                        {submission.status_approval_admin !== 'PENDING' && (
                          <span className="text-gray-400 text-xs">Tidak dapat diubah</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Actions Footer */}
        {/* {!loading && submissions.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/vendor/submissions/create">
                <Button variant="primary" size="sm" className="w-full sm:w-auto">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Buat Pengajuan Baru
                </Button>
              </Link>
              <Link href="/vendor/submissions">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  Kelola Semua Pengajuan
                </Button>
              </Link>
            </div>
          </div>
        )} */}
      </Card>

      {/* Modal Detail */}
      <SubmissionDetailModal
        submission={selectedSubmission}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.show}
        onClose={() => setConfirmModal(prev => ({ ...prev, show: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
        confirmText="Hapus"
        cancelText="Batal"
        isLoading={confirmModal.isLoading}
      />
    </div>
  );
}
