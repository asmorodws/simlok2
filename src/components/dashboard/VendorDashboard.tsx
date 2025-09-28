"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { 
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";

import DashboardTemplate from "@/components/layout/DashboardTemplate";
import { 
  StatusBadge, 
  ActionButtonGroup,
  type ColumnDef 
} from "@/components/ui";

import ConfirmModal from "../ui/modal/ConfirmModal";
import SubmissionDetailModal from "../vendor/SubmissionDetailModal";
import { useStatsStore } from "@/store/useStatsStore";
import { useSubmissionStore } from "@/store/useSubmissionStore";
import { useSocket } from "@/components/common/RealtimeUpdates";

interface VendorSubmission {
  id: string;
  approval_status: string;
  vendor_name: string;
  job_description: string;
  work_location: string;
  simlok_number?: string;
  created_at: string;
  // Additional fields to match Submission interface
  based_on: string;
  officer_name: string;
  implementation: string | null;
  working_hours: string;
  other_notes?: string;
  work_facilities: string;
  worker_names: string;
  content: string;
  user: {
    id: string;
    officer_name: string;
    email: string;
    vendor_name: string;
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

  // Modal states
  const [selectedSubmission, setSelectedSubmission] = useState<VendorSubmission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

      setConfirmModal(prev => ({ ...prev, show: false, isLoading: false }));
      
      // Refresh data
      await fetchVendorSubmissions();
      await fetchVendorStats();
    } catch (error) {
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
      console.error('Error deleting submission:', error);
    }
  };

  const handleViewDetail = useCallback(async (submission: VendorSubmission) => {
    try {
      const response = await fetch(`/api/submissions/${submission.id}`);
      if (response.ok) {
        const fullSubmissionData = await response.json();
        setSelectedSubmission(fullSubmissionData);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching submission details:', error);
    }
  }, []);

  // Statistics configuration
  const statsData = [
    {
      id: "total-approved",
      label: "Total Disetujui", 
      value: vendorStats?.totalApproved || 0,
      icon: <CheckCircleIcon className="h-6 w-6" />,
      color: "green" as const,
      loading: statsLoading,
      onClick: () => window.location.href = "/vendor/submissions?status=approved"
    },
    {
      id: "total-pending",
      label: "Total Menunggu",
      value: vendorStats?.totalPending || 0,
      icon: <ClockIcon className="h-6 w-6" />,
      color: "yellow" as const,
      loading: statsLoading,
      onClick: () => window.location.href = "/vendor/submissions?status=pending"
    },
    {
      id: "total-rejected", 
      label: "Total Ditolak",
      value: vendorStats?.totalRejected || 0,
      icon: <XCircleIcon className="h-6 w-6" />,
      color: "red" as const,
      loading: statsLoading,
      onClick: () => window.location.href = "/vendor/submissions?status=rejected"
    }
  ];

  // Submissions table columns
  const submissionsColumns: ColumnDef<VendorSubmission>[] = [
    {
      key: "job_description",
      header: "Pekerjaan",
      cell: (row) => (
        <div className="max-w-xs truncate" title={row.job_description}>
          {row.job_description}
        </div>
      )
    },
    {
      key: "work_location", 
      header: "Lokasi Kerja",
      cell: (row) => (
        <div className="max-w-xs truncate" title={row.work_location}>
          {row.work_location}
        </div>
      )
    },
    {
      key: "approval_status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.approval_status} />
    },
    {
      key: "simlok_number",
      header: "No. SIMLOK", 
      accessor: "simlok_number",
      cell: (row) => row.simlok_number || "-"
    },
    {
      key: "created_at",
      header: "Tanggal",
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
        <ActionButtonGroup
          actions={[
            {
              action: "view",
              onClick: () => handleViewDetail(row),
              tooltip: "Lihat detail"
            },
            ...(row.approval_status === 'PENDING' ? [
              {
                action: "edit" as const,
                onClick: () => window.location.href = `/vendor/submissions/edit/${row.id}`,
                tooltip: "Edit pengajuan"
              },
              {
                action: "delete" as const,
                onClick: () => handleDelete(row.id),
                tooltip: "Hapus pengajuan"
              }
            ] : [])
          ]}
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
          onClick: () => window.location.href = "/vendor/submissions",
          variant: "outline" as const
        }
      ]
    }
  ];

  // Header actions
  const headerActions = [
    {
      label: "Buat Pengajuan",
      onClick: () => window.location.href = "/vendor/submissions/create",
      icon: <PlusIcon className="w-5 h-5" />,
      variant: "primary" as const
    }
  ];

  const getDescription = () => {
    const vendorName = session?.user.vendor_name;
    return vendorName 
      ? `${vendorName} - Kelola pengajuan SIMLOK Anda`
      : "Kelola pengajuan SIMLOK Anda";
  };

  return (
    <>
      <DashboardTemplate
        description={getDescription()}
        role="VENDOR"
        headerActions={headerActions}
        stats={statsData}
        tables={tablesConfig}
        tablesLayout="single"
      />

      {/* Modals */}
      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSubmission(null);
          }}
        />
      )}

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
    </>
  );
}