"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";
import { Card, Button, Alert, Badge } from '@/components/ui';
import ConfirmModal from "../ui/modal/ConfirmModal";
import SubmissionDetailModal from "../vendor/SubmissionDetailModal";
import { useStatsStore } from "@/store/useStatsStore";
import { useSubmissionStore } from "@/store/useSubmissionStore";
import { useSocket } from "@/components/common/RealtimeUpdates";

interface VendorSubmission {
  id: string;
  approval_status: string;
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
  sika_document_upload?: string;
  simja_document_upload?: string;
  qrcode?: string;
  created_at: string;
  signer_position?: string;
  signer_name?: string;
  user: {
    id: string;
    officer_name: string;
    email: string;
    vendor_name: string;
  };
  approvedByUser?: {
    id: string;
    officer_name: string;
    email: string;
  };
}

export default function VendorDashboard() {
  const { data: session } = useSession();
  
  // Use Zustand stores for realtime data
  const { 
    vendorStats,
    loading: statsLoading,
    fetchVendorStats 
  } = useStatsStore();
  
  const { 
    submissions,
    loading: submissionsLoading,
    fetchVendorSubmissions 
  } = useSubmissionStore();
  
  // Initialize Socket.IO connection
  useSocket();

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
    // Initialize data fetching
    if (session?.user?.id) {
      fetchVendorStats();
      fetchVendorSubmissions();
    }
  }, [session?.user?.id, fetchVendorStats, fetchVendorSubmissions]);

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
      case 'REJECTED': return <Badge variant="error">Ditolak</Badge>;
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
      await fetchVendorSubmissions();
      await fetchVendorStats();
      
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

  const handleViewDetail = useCallback(async (submission: VendorSubmission) => {
    try {
      // Fetch full submission data from API
      const response = await fetch(`/api/submissions/${submission.id}`);
      if (response.ok) {
        const fullSubmissionData = await response.json();
        setSelectedSubmission(fullSubmissionData);
        setIsModalOpen(true);
      } else {
        console.error('Failed to fetch submission details');
        setAlert({
          show: true,
          variant: 'error',
          title: 'Error',
          message: 'Gagal memuat detail pengajuan'
        });
      }
    } catch (error) {
      console.error('Error fetching submission details:', error);
      setAlert({
        show: true,
        variant: 'error',
        title: 'Error',
        message: 'Terjadi kesalahan saat memuat detail pengajuan'
      });
    }
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Selamat datang di dashboard vendor, {session?.user.officer_name ?? session?.user.name ?? "Vendor"}
            </h1>
            <p className="text-gray-600 mt-1">
              {session?.user.vendor_name && `${session.user.vendor_name} - `}
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
              <p className="text-sm font-medium text-gray-600">Total Disetujui</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {statsLoading ? '...' : vendorStats?.totalApproved || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Menunggu</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {statsLoading ? '...' : vendorStats?.totalPending || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ditolak</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {statsLoading ? '...' : vendorStats?.totalRejected || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircleIcon className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Submissions Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Pengajuan Terbaru</h3>
          <Link href="/vendor/submissions" className="text-sm text-blue-600 hover:text-blue-500">
            Lihat Semua
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pekerjaan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lokasi Kerja
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No. SIMLOK
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {submissionsLoading ? (
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
                      <h3 className="text-sm font-medium text-gray-900">Belum ada pengajuan</h3>
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
                submissions.slice(0, 5).map((submission: any) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={submission.job_description}>
                        {submission.job_description}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <div className="max-w-xs truncate" title={submission.work_location}>
                        {submission.work_location}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(submission.approval_status)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {submission.simlok_number || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
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
                        {submission.approval_status === 'PENDING' && (
                          <>
                            <Link href={`/vendor/submissions/edit/${submission.id}`}>
                              <Button
                                variant="destructive"
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
                        {submission.approval_status !== 'PENDING' && (
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
          <div className="mt-6 pt-4 border-t border-gray-200">
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
      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}

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
