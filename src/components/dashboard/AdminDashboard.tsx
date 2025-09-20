"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  UserGroupIcon, 
  ClipboardDocumentCheckIcon, 
  ClockIcon,
  EyeIcon
} from "@heroicons/react/24/outline";
import Card from "../ui/Card";
import { Badge } from "../ui/Badge";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import ConfirmModal from "../ui/modal/ConfirmModal";
import UserVerificationModal from "../admin/UserVerificationModal";
import { UserData } from "@/types/user";
import { useStatsStore } from "@/store/useStatsStore";
import { useSubmissionStore } from "@/store/useSubmissionStore";
import { useUserStore } from "@/store/useUserStore";
import { useSocket } from "@/components/common/RealtimeUpdates";

export default function AdminDashboard() {
  const { data: session } = useSession();
  
  // Use Zustand stores for realtime data
  const { 
    adminStats,
    loading: statsLoading,
    fetchAdminStats 
  } = useStatsStore();
  
  const { 
    submissions,
    loading: submissionsLoading,
    fetchLatestSubmissions 
  } = useSubmissionStore();
  
  const { 
    pendingUsers,
    loading: usersLoading,
    fetchPendingUsers 
  } = useUserStore();
  
  // Initialize Socket.IO connection
  useSocket();
  
  // Modal states
  const [selectedVendor, setSelectedVendor] = useState<UserData | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Alert state
  const [alert, _setAlert] = useState<{
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
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    // Initialize data fetching
    fetchAdminStats();
    fetchLatestSubmissions();
    fetchPendingUsers();
  }, [fetchAdminStats, fetchLatestSubmissions, fetchPendingUsers]);

  const handleOpenVerificationModal = (vendor: UserData) => {
    setSelectedVendor(vendor);
    setIsVerificationModalOpen(true);
  };

  const handleCloseVerificationModal = () => {
    setIsVerificationModalOpen(false);
    setSelectedVendor(null);
  };

  const handleUserUpdate = (_updatedUser: any) => {
    // Refresh data after user update
    fetchPendingUsers();
    fetchAdminStats();
  };

  const handleUserRemove = (_userId: string) => {
    // Refresh data after user removal
    fetchPendingUsers();
    fetchAdminStats();
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="warning">Menunggu Review</Badge>;
      case 'APPROVED': return <Badge variant="success">Disetujui</Badge>;
      case 'REJECTED': return <Badge variant="destructive">Ditolak</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

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
        <h1 className="text-2xl font-semibold text-gray-900">
          Selamat datang di dashboard admin, {session?.user.officer_name ?? session?.user.name ?? "Admin"}
        </h1>
        <p className="text-gray-600 mt-1">
          Kelola sistem dan monitor aktivitas pengguna
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Vendor</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {statsLoading ? '...' : adminStats?.totalVendors || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Menunggu Verifikasi Vendor</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {statsLoading ? '...' : adminStats?.pendingVerificationVendors || 0}
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
              <p className="text-sm font-medium text-gray-600">Total Menunggu Verifikasi Pengajuan SIMLOK</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {statsLoading ? '...' : adminStats?.pendingVerificationSubmissions || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <ClipboardDocumentCheckIcon className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Submissions Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Pengajuan Terbaru</h3>
            <Link href="/admin/submissions" className="text-sm text-blue-600 hover:text-blue-500">
              Lihat Semua
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pekerjaan
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submissionsLoading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                      Belum ada pengajuan
                    </td>
                  </tr>
                ) : (
                  submissions.slice(0, 5).map((submission: any) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {submission.vendor_name}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-600 truncate max-w-xs">
                        {submission.job_description}
                      </td>
                      <td className="px-3 py-4">
                        {getStatusBadge(submission.approval_status)}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {formatDate(submission.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pending Vendors Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Vendor Yang Perlu Di Verifikasi</h3>
            <Link href="/admin/users?filter=pending" className="text-sm text-blue-600 hover:text-blue-500">
              Lihat Semua
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal Daftar
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usersLoading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : pendingUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                      Tidak ada vendor yang perlu diverifikasi
                    </td>
                  </tr>
                ) : (
                  pendingUsers.slice(0, 5).map((vendor: any) => (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {vendor.officer_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {vendor.vendor_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-600">
                        {vendor.email}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {formatDate(vendor.created_at)}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleOpenVerificationModal(vendor)}
                            variant="outline"
                            size="sm"
                            className="!px-3 !py-1"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* User Verification Modal */}
      <UserVerificationModal
        user={selectedVendor}
        isOpen={isVerificationModalOpen}
        onClose={handleCloseVerificationModal}
        onUserUpdate={handleUserUpdate}
        onUserRemove={handleUserRemove}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
