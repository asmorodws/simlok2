"use client";

import { useState, useEffect } from "react";
import { 
  UserGroupIcon, 
  ClipboardDocumentCheckIcon, 
  ClockIcon,
} from "@heroicons/react/24/outline";

import DashboardTemplate from "@/components/layout/DashboardTemplate";
import { 
  StatusBadge, 
  ActionButton,
  type ColumnDef 
} from "@/components/ui";

import ConfirmModal from "../ui/modal/ConfirmModal";
import UserVerificationModal from "../admin/UserVerificationModal";
import { UserData } from "@/types/user";
import { useStatsStore } from "@/store/useStatsStore";
import { useSubmissionStore } from "@/store/useSubmissionStore";
import { useUserStore } from "@/store/useUserStore";
import { useSocket } from "@/components/common/RealtimeUpdates";

export default function AdminDashboard() {
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

  // Statistics configuration
  const statsData = [
    {
      id: "total-vendors",
      label: "Total Vendor",
      value: adminStats?.totalVendors || 0,
      icon: <UserGroupIcon className="h-6 w-6" />,
      color: "blue" as const,
      loading: statsLoading
    },
    {
      id: "pending-verification-vendors",
      label: "Vendor Menunggu Verifikasi",
      value: adminStats?.pendingVerificationVendors || 0,
      icon: <ClockIcon className="h-6 w-6" />,
      color: "yellow" as const,
      loading: statsLoading,
      onClick: () => window.location.href = "/admin/users?filter=pending"
    },
    {
      id: "pending-verification-submissions",
      label: "Pengajuan Menunggu Verifikasi",
      value: adminStats?.pendingVerificationSubmissions || 0,
      icon: <ClipboardDocumentCheckIcon className="h-6 w-6" />,
      color: "red" as const,
      loading: statsLoading,
      onClick: () => window.location.href = "/admin/submissions?status=pending"
    }
  ];

  // Submissions table configuration
  const submissionsColumns: ColumnDef<any>[] = [
    {
      key: "vendor_name",
      header: "Vendor",
      accessor: "vendor_name"
    },
    {
      key: "job_description",
      header: "Pekerjaan",
      accessor: "job_description",
      cell: (row) => (
        <span className="truncate max-w-xs block">
          {row.job_description}
        </span>
      )
    },
    {
      key: "approval_status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.approval_status} />
    },
    {
      key: "created_at",
      header: "Tanggal",
      cell: (row) => (
        <span className="text-sm text-gray-500">
          {formatDate(row.created_at)}
        </span>
      )
    }
  ];

  // Pending users table configuration
  const pendingUsersColumns: ColumnDef<any>[] = [
    {
      key: "name",
      header: "Nama",
      cell: (row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {row.officer_name}
          </div>
          <div className="text-sm text-gray-500">
            {row.vendor_name}
          </div>
        </div>
      )
    },
    {
      key: "email",
      header: "Email",
      accessor: "email"
    },
    {
      key: "created_at",
      header: "Tanggal Daftar",
      cell: (row) => (
        <span className="text-sm text-gray-500">
          {formatDate(row.created_at)}
        </span>
      )
    },
    {
      key: "actions",
      header: "Aksi",
      cell: (row) => (
        <ActionButton
          action="view"
          onClick={() => handleOpenVerificationModal(row)}
          tooltip="Lihat detail dan verifikasi"
        />
      )
    }
  ];

  // Tables configuration
  const tablesConfig = [
    {
      title: "Pengajuan Terbaru",
      data: submissions.slice(0, 5),
      columns: submissionsColumns,
      loading: submissionsLoading,
      emptyMessage: "Belum ada pengajuan",
      actions: [
        {
          label: "Lihat Semua",
          onClick: () => window.location.href = "/admin/submissions",
          variant: "outline" as const
        }
      ]
    },
    {
      title: "Vendor Yang Perlu Diverifikasi",
      data: pendingUsers.slice(0, 5),
      columns: pendingUsersColumns,
      loading: usersLoading,
      emptyMessage: "Tidak ada vendor yang perlu diverifikasi",
      actions: [
        {
          label: "Lihat Semua",
          onClick: () => window.location.href = "/admin/users?filter=pending",
          variant: "outline" as const
        }
      ]
    }
  ];

  return (
    <>
      <DashboardTemplate
        description="Kelola sistem dan monitor aktivitas pengguna"
        role="ADMIN"
        stats={statsData}
        tables={tablesConfig}
        tablesLayout="grid-2"
      />

      {/* Modals */}
      <UserVerificationModal
        user={selectedVendor}
        isOpen={isVerificationModalOpen}
        onClose={handleCloseVerificationModal}
        onUserUpdate={handleUserUpdate}
        onUserRemove={handleUserRemove}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}