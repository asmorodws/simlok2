"use client";

import { useState, useEffect, useCallback } from 'react';
import DashboardTemplate from '@/components/layout/DashboardTemplate';
import { useSocket } from '@/components/common/RealtimeUpdates';
import ApproverSubmissionDetailModal from '@/components/approver/ApproverSubmissionDetailModal';

interface ApproverSubmission {
  id: string;
  approval_status: string;
  review_status: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
  final_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
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
  review_note?: string;
  final_note?: string;
  sika_document_upload?: string;
  simja_document_upload?: string;
  qrcode?: string;
  created_at: string;
  updated_at?: string;
  reviewed_at?: string | null;
  approved_at?: string | null;
  reviewed_by?: string | null;
  approved_by?: string | null;
  workers: Array<{
    id: string;
    worker_name: string;
    worker_photo: string | null;
  }>;
}

interface ApproverStatsData {
  total: number;
  pending_approval_meets: number;
  pending_approval_not_meets: number;
  approved: number;
  rejected: number;
}

export default function ApproverDashboard() {
  const [submissions, setSubmissions] = useState<ApproverSubmission[]>([]);
  const [stats, setStats] = useState<ApproverStatsData>({
    total: 0,
    pending_approval_meets: 0,
    pending_approval_not_meets: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/approver/simloks?page=1&limit=10&sortBy=reviewed_at&sortOrder=desc');
      if (!response.ok) {
        throw new Error('Gagal mengambil data dashboard');
      }
      
      const data = await response.json();
      setSubmissions(data.submissions);
      setStats(data.statistics);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Socket untuk real-time updates
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket) return;

    socket.emit('join', { role: 'APPROVER' });

    const handleNotificationNew = (notification: any) => {
      if (notification.type === 'reviewed_submission_approval') {
        fetchDashboardData();
      }
    };

    const handleStatsUpdate = (statsUpdate: any) => {
      if (statsUpdate.scope === 'approver') {
        fetchDashboardData();
      }
    };

    const handleSubmissionReviewed = () => {
      fetchDashboardData();
    };

    socket.on('notification:new', handleNotificationNew);
    socket.on('stats:update', handleStatsUpdate);
    socket.on('submission:reviewed', handleSubmissionReviewed);

    return () => {
      socket.off('notification:new', handleNotificationNew);
      socket.off('stats:update', handleStatsUpdate);
      socket.off('submission:reviewed', handleSubmissionReviewed);
    };
  }, [socket, fetchDashboardData]);

  const handleViewDetail = (submissionId: string) => {
    setSelectedSubmission(submissionId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
  };

  const handleApprovalSubmitted = () => {
    fetchDashboardData();
    handleCloseModal();
  };

  // Prepare stats for StatsGrid
  const statsData = [
    {
      id: "total",
      label: "Total Pengajuan",
      value: stats.total || 0,
      color: "blue" as const
    },
    {
      id: "pending", 
      label: "Menunggu Persetujuan", 
      value: (stats.pending_approval_meets + stats.pending_approval_not_meets) || 0,
      color: "yellow" as const
    },
    {
      id: "approved",
      label: "Disetujui",
      value: stats.approved || 0,  
      color: "green" as const
    },
    {
      id: "rejected",
      label: "Ditolak",
      value: stats.rejected || 0,
      color: "red" as const
    }
  ];

  // Prepare submissions for DataTable
  const submissionsColumns = [
    { 
      key: "vendor_info", 
      header: "Vendor & Petugas", 
      cell: (row: any) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.vendor_info.primary}</div>
          <div className="text-sm text-gray-500">{row.vendor_info.secondary}</div>
        </div>
      )
    },
    { 
      key: "job_info", 
      header: "Pekerjaan & Lokasi", 
      cell: (row: any) => (
        <div>
          <div className="text-sm text-gray-900 max-w-xs truncate">{row.job_info.primary}</div>
          <div className="text-sm text-gray-500">{row.job_info.secondary}</div>
        </div>
      )
    },
    { 
      key: "review_status", 
      header: "Status Review", 
      cell: (row: any) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.review_status.variant === 'success' ? 'bg-green-100 text-green-800' :
          row.review_status.variant === 'warning' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.review_status.status}
        </span>
      )
    },
    { 
      key: "final_status", 
      header: "Status Persetujuan", 
      cell: (row: any) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.final_status.variant === 'success' ? 'bg-green-100 text-green-800' :
          row.final_status.variant === 'warning' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.final_status.status}
        </span>
      )
    },
    { 
      key: "created_at", 
      header: "Tanggal",
      accessor: "created_at"
    },
    { 
      key: "actions", 
      header: "Aksi", 
      cell: (row: any) => (
        <button 
          onClick={() => handleViewDetail(row.id)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Detail
        </button>
      )
    }
  ];

  const submissionsData = submissions.map((submission) => ({
    id: submission.id,
    vendor_info: {
      primary: submission.vendor_name,
      secondary: submission.officer_name
    },
    job_info: {
      primary: submission.job_description,
      secondary: submission.work_location
    },
    review_status: {
      status: submission.review_status === 'PENDING_REVIEW' ? 'Menunggu Review' : 
               submission.review_status === 'MEETS_REQUIREMENTS' ? 'Memenuhi Syarat' : 'Tidak Memenuhi Syarat',
      variant: submission.review_status === 'PENDING_REVIEW' ? 'warning' : 
               submission.review_status === 'MEETS_REQUIREMENTS' ? 'success' : 'error'
    },
    final_status: {
      status: submission.final_status === 'PENDING_APPROVAL' ? 'Menunggu Persetujuan' :
               submission.final_status === 'APPROVED' ? 'Disetujui' : 'Ditolak',
      variant: submission.final_status === 'PENDING_APPROVAL' ? 'warning' :
               submission.final_status === 'APPROVED' ? 'success' : 'error'
    },
    created_at: new Date(submission.created_at).toLocaleDateString('id-ID')
  }));

  const headerActions = [
    {
      label: "Lihat Semua Pengajuan",
      onClick: () => window.location.href = "/approver/submissions",
      variant: "primary" as const
    }
  ];

  const submissionsTable = {
    title: "Pengajuan Untuk Persetujuan",
    data: submissionsData,
    columns: submissionsColumns,
    loading: loading,
    emptyMessage: "Tidak ada pengajuan yang perlu disetujui"
  };

  return (
    <>
      <DashboardTemplate
        title="Selamat datang di Dashboard Approver"
        subtitle="Kelola persetujuan pengajuan SIMLOK"
        stats={statsData}
        statsColumns={4}
        tables={[submissionsTable]}
        tablesLayout="single"
        headerActions={headerActions}
        loading={loading}
      />

      {/* Modal */}
      {selectedSubmission && (
        <ApproverSubmissionDetailModal
          submissionId={selectedSubmission}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onApprovalSubmitted={handleApprovalSubmitted}
        />
      )}
    </>
  );
}