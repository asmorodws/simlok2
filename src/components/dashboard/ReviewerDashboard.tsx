"use client";

import { useState, useEffect, useCallback } from 'react';
import DashboardTemplate from '@/components/layout/DashboardTemplate';
import { useSocket } from '@/components/common/RealtimeUpdates';
import ReviewerSubmissionDetailModal from '@/components/reviewer/ReviewerSubmissionDetailModal';

interface ReviewerSubmission {
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
  reviewed_at?: string;
  approved_at?: string;
  user: {
    id: string;
    officer_name: string;
    email: string;
    vendor_name: string;
  };
  reviewed_by_user?: {
    id: string;
    officer_name: string;
    email: string;
  };
  approved_by_final_user?: {
    id: string;
    officer_name: string;
    email: string;
  };
  worker_list: Array<{
    id: string;
    worker_name: string;
    worker_photo: string | null;
  }>;
}

interface ReviewerStatsData {
  pendingReview: number;
  meetsRequirements: number;
  notMeetsRequirements: number;
  total: number;
  pendingUserVerifications?: number;
  totalVerifiedUsers?: number;
}

export default function ReviewerDashboard() {
  const [submissions, setSubmissions] = useState<ReviewerSubmission[]>([]);
  const [stats, setStats] = useState<ReviewerStatsData>({ 
    pendingReview: 0, 
    meetsRequirements: 0, 
    notMeetsRequirements: 0, 
    total: 0,
    pendingUserVerifications: 0,
    totalVerifiedUsers: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/reviewer/simloks?page=1&limit=10&sortBy=created_at&sortOrder=desc');
      if (!response.ok) {
        throw new Error('Gagal mengambil data dashboard');
      }
      
      const data = await response.json();
      setSubmissions(data.submissions || []);
      setStats(data.stats || { pendingReview: 0, meetsRequirements: 0, notMeetsRequirements: 0, total: 0 });
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

    socket.emit('join', { role: 'REVIEWER' });

    const handleNotificationNew = (notification: any) => {
      if (notification.type === 'new_submission_review') {
        fetchDashboardData();
      }
    };

    const handleStatsUpdate = (statsUpdate: any) => {
      if (statsUpdate.scope === 'reviewer') {
        fetchDashboardData();
      }
    };

    const handleSubmissionCreated = () => {
      fetchDashboardData();
    };

    socket.on('notification:new', handleNotificationNew);
    socket.on('stats:update', handleStatsUpdate);
    socket.on('submission:created', handleSubmissionCreated);

    return () => {
      socket.off('notification:new', handleNotificationNew);
      socket.off('stats:update', handleStatsUpdate);
      socket.off('submission:created', handleSubmissionCreated);
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

  const handleReviewSubmitted = () => {
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
      label: "Menunggu Review", 
      value: stats.pendingReview || 0,
      color: "yellow" as const
    },
    {
      id: "meets",
      label: "Memenuhi Syarat",
      value: stats.meetsRequirements || 0,  
      color: "green" as const
    },
    {
      id: "not-meets",
      label: "Tidak Memenuhi",
      value: stats.notMeetsRequirements || 0,
      color: "red" as const
    },
    {
      id: "user-pending",
      label: "User Perlu Verifikasi",
      value: stats.pendingUserVerifications || 0,
      color: "purple" as const
    },
    {
      id: "user-verified", 
      label: "User Terverifikasi", 
      value: stats.totalVerifiedUsers || 0,
      color: "gray" as const
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
      key: "work_location", 
      header: "Lokasi Kerja",
      accessor: "work_location" 
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
          {row.review_status.status === 'PENDING_REVIEW' ? 'Menunggu Review' :
           row.review_status.status === 'MEETS_REQUIREMENTS' ? 'Memenuhi Syarat' : 'Tidak Memenuhi Syarat'}
        </span>
      )
    },
    { 
      key: "final_status", 
      header: "Status Akhir",
      cell: (row: any) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.final_status.variant === 'success' ? 'bg-green-100 text-green-800' :
          row.final_status.variant === 'warning' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.final_status.status === 'PENDING_APPROVAL' ? 'Menunggu Persetujuan' :
           row.final_status.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
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
      secondary: submission.user.officer_name
    },
    work_location: submission.work_location,
    review_status: {
      status: submission.review_status,
      variant: submission.review_status === 'PENDING_REVIEW' ? 'warning' : 
               submission.review_status === 'MEETS_REQUIREMENTS' ? 'success' : 'error'
    },
    final_status: {
      status: submission.final_status, 
      variant: submission.final_status === 'PENDING_APPROVAL' ? 'warning' :
               submission.final_status === 'APPROVED' ? 'success' : 'error'
    },
    created_at: new Date(submission.created_at).toLocaleDateString('id-ID')
  }));

  const headerActions = [
    {
      label: "Lihat Semua Review",
      onClick: () => window.location.href = "/reviewer/submissions",
      variant: "primary" as const
    }
  ];

  const submissionsTable = {
    title: "Pengajuan Untuk Review",
    data: submissionsData,
    columns: submissionsColumns,
    loading: loading,
    emptyMessage: "Pengajuan yang perlu direview akan muncul di sini"
  };

  return (
    <>
      <DashboardTemplate
        title="Selamat datang di Dashboard Reviewer"
        subtitle="Kelola review pengajuan SIMLOK"
        stats={statsData}
        statsColumns={3}
        tables={[submissionsTable]}
        tablesLayout="single"
        headerActions={headerActions}
        loading={loading}
      />

      {/* Modal */}
      {selectedSubmission && (
        <ReviewerSubmissionDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          submissionId={selectedSubmission}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </>
  );
}