"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  UserGroupIcon, 
  ClipboardDocumentCheckIcon, 
  ClockIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import Card from "../ui/Card";
import { Badge } from "../ui/Badge";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import ConfirmModal from "../ui/modal/ConfirmModal";
import UserVerificationModal from "../admin/UserVerificationModal";
import { UserData } from "@/types/user";

interface DashboardStats {
  totalVendors: number;
  pendingVerificationVendors: number;
  pendingVerificationSubmissions: number;
}

interface LatestSubmission {
  id: string;
  nama_vendor: string;
  pekerjaan: string;
  status_approval_admin: string;
  created_at: string;
}

interface PendingVendor extends UserData {
  // Extending UserData to ensure compatibility
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalVendors: 0,
    pendingVerificationVendors: 0,
    pendingVerificationSubmissions: 0
  });
  const [latestSubmissions, setLatestSubmissions] = useState<LatestSubmission[]>([]);
  const [pendingVendors, setPendingVendors] = useState<PendingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedVendor, setSelectedVendor] = useState<PendingVendor | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

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
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const [statsRes, submissionsRes, vendorsRes] = await Promise.all([
        fetch('/api/admin/dashboard-stats'),
        fetch('/api/admin/latest-submissions'),
        fetch('/api/admin/pending-vendors')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json();
        setLatestSubmissions(submissionsData.submissions || []);
      }

      if (vendorsRes.ok) {
        const vendorsData = await vendorsRes.json();
        setPendingVendors(vendorsData.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyVendor = async (vendorId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/users/${vendorId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        // Refresh data after verification
        fetchDashboardData();
        // Close modal
        setIsVerificationModalOpen(false);
        setSelectedVendor(null);
        
        // Show success message
        setAlert({
          show: true,
          variant: 'success',
          title: 'Berhasil!',
          message: `Vendor berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}`
        });
        
        // Auto hide after 3 seconds
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      } else {
        const error = await response.json();
        setAlert({
          show: true,
          variant: 'error',
          title: 'Gagal',
          message: error.error || `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} vendor`
        });
        
        // Auto hide after 5 seconds
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);
      }
    } catch (error) {
      console.error('Error:', error);
      setAlert({
        show: true,
        variant: 'error',
        title: 'Terjadi Kesalahan',
        message: `Terjadi kesalahan saat ${action === 'approve' ? 'menyetujui' : 'menolak'} vendor`
      });
      
      // Auto hide after 5 seconds
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 5000);
    }
  };

  const handleOpenVerificationModal = (vendor: PendingVendor) => {
    setSelectedVendor(vendor);
    setIsVerificationModalOpen(true);
  };

  const handleCloseVerificationModal = () => {
    setIsVerificationModalOpen(false);
    setSelectedVendor(null);
  };

  const handleUserUpdate = (updatedUser: any) => {
    // Update pending vendors list
    setPendingVendors(prev => prev.filter(v => v.id !== updatedUser.id));
    // Refresh dashboard data
    fetchDashboardData();
  };

  const handleUserRemove = (userId: string) => {
    // Remove vendor from pending list
    setPendingVendors(prev => prev.filter(v => v.id !== userId));
    // Refresh dashboard data
    fetchDashboardData();
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
      <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Selamat datang di dashboard admin, {session?.user.nama_petugas ?? session?.user.name ?? "Admin"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Kelola sistem dan monitor aktivitas pengguna
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Vendor</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {loading ? '...' : stats.totalVendors}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Menunggu Verifikasi Vendor</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                {loading ? '...' : stats.pendingVerificationVendors}
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Menunggu Verifikasi Pengajuan SIMLOK</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                {loading ? '...' : stats.pendingVerificationSubmissions}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
              <ClipboardDocumentCheckIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Submissions Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pengajuan Terbaru</h3>
            <Link href="/admin/submissions" className="text-sm text-blue-600 hover:text-blue-500">
              Lihat Semua
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Pekerjaan
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : latestSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                      Belum ada pengajuan
                    </td>
                  </tr>
                ) : (
                  latestSubmissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">
                        {submission.nama_vendor}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">
                        {submission.pekerjaan}
                      </td>
                      <td className="px-3 py-4">
                        {getStatusBadge(submission.status_approval_admin)}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vendor Yang Perlu Di Verifikasi</h3>
            <Link href="/admin/users?filter=pending" className="text-sm text-blue-600 hover:text-blue-500">
              Lihat Semua
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tanggal Daftar
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : pendingVendors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                      Tidak ada vendor yang perlu diverifikasi
                    </td>
                  </tr>
                ) : (
                  pendingVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-3 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {vendor.nama_petugas}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {vendor.nama_vendor}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {vendor.email}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(vendor.date_created_at)}
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
