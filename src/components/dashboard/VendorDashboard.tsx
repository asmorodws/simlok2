// app/vendor/VendorDashboard.tsx
"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PlusIcon } from "@heroicons/react/24/outline";
import Card from "../ui/Card";
import Button from "../ui/button/Button";
import SubmissionDetailModal from "../vendor/SubmissionDetailModal";
import ConfirmModal from "../ui/modal/ConfirmModal";
import { useStatsStore } from "@/store/useStatsStore";
import { useSubmissionStore } from "@/store/useSubmissionStore";
import { useSocket } from "@/components/common/RealtimeUpdates";
import { useToast } from "@/hooks/useToast";

import { SubmissionsTable } from "@/components/submissions/SubmissionsTable";
import SubmissionsCardView from "@/components/submissions/SubmissionsCardView";

export default function VendorDashboard() {
  const { data: session } = useSession();
  const { vendorStats, loading: statsLoading, fetchVendorStats } = useStatsStore();
  const { submissions, loading: submissionsLoading, fetchVendorSubmissions, deleteSubmission } = useSubmissionStore();
  const { showSuccess, showError } = useToast();

  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
    isLoading: false,
  });


  const socket = useSocket();

  useEffect(() => {
    if (session?.user?.id) {
      fetchVendorStats();
      fetchVendorSubmissions();
    }
  }, [session?.user?.id, fetchVendorStats, fetchVendorSubmissions]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.emit('join', { role: 'VENDOR' });

    const handleSubmissionUpdate = () => {
      if (session?.user?.id) {
        fetchVendorStats();
        fetchVendorSubmissions();
      }
    };

    socket.on('submission:reviewed', handleSubmissionUpdate);
    socket.on('submission:approved', handleSubmissionUpdate);
    socket.on('submission:rejected', handleSubmissionUpdate);

    return () => {
      socket.off('submission:reviewed', handleSubmissionUpdate);
      socket.off('submission:approved', handleSubmissionUpdate);
      socket.off('submission:rejected', handleSubmissionUpdate);
    };
  }, [socket, session?.user?.id, fetchVendorStats, fetchVendorSubmissions]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

  const handleDelete = useCallback(async (id: string) => {
    const submission = submissions.find(s => s.id === id);
    setConfirmModal({
      show: true,
      title: "Konfirmasi Hapus",
      message: `Apakah Anda yakin ingin menghapus pengajuan "${submission?.job_description}"? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, isLoading: true }));
          await deleteSubmission(id);
          showSuccess("Berhasil", "Pengajuan berhasil dihapus");
          setConfirmModal({ show: false, title: "", message: "", onConfirm: () => {}, isLoading: false });
          // Refresh the data to update the UI
          fetchVendorSubmissions();
        } catch (error) {
          console.error('Error deleting submission:', error);
          showError("Error", "Gagal menghapus pengajuan");
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false,
    });
  }, [submissions, showSuccess, showError, deleteSubmission, fetchVendorSubmissions]);

  const handleViewDetail = useCallback((submissionRow: any) => {
    // Find the full submission data from the store using the ID
    const fullSubmission = submissions.find(s => s.id === submissionRow.id);
    if (fullSubmission) {
      console.log('VendorDashboard: Setting full submission data for modal:', fullSubmission);
      setSelectedSubmission(fullSubmission);
      setIsModalOpen(true);
    } else {
      console.error('VendorDashboard: Could not find full submission data for ID:', submissionRow.id);
    }
  }, [submissions]);

  return (
    <div className="space-y-8">
      {/* Header */}
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
          <div className="mt-4 sm:mt-0 flex items-center gap-3">
            <Link href="/vendor/submissions/create">
              <Button variant="primary" size="md">
                <PlusIcon className="w-5 h-5 mr-2" /> Buat pengajuan
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Disetujui</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {statsLoading ? "..." : vendorStats?.totalApproved || 0}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Menunggu</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {statsLoading ? "..." : vendorStats?.totalPending || 0}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Ditolak</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {statsLoading ? "..." : vendorStats?.totalRejected || 0}
          </p>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Pengajuan Terbaru</h3>
          <Link href="/vendor/submissions" className="text-sm text-blue-600">Lihat Semua</Link>
        </div>

        <div className="hidden sm:block">
          <SubmissionsTable
          submissions={submissions.slice(0, 10).map((submission: any) => ({
            id: submission.id,
            job_description: submission.job_description,
            officer_name: submission.officer_name,
            work_location: submission.work_location,
            work_hours: submission.working_hours ?? "", // Fixed: API returns 'working_hours', not 'work_hours'
            approval_status: submission.approval_status,
            review_status: submission.review_status ?? 'PENDING_REVIEW',
            simlok_number: submission.simlok_number,
            created_at: submission.created_at,
          }))}
          loading={submissionsLoading}
          onView={handleViewDetail}
          onDelete={handleDelete}
          formatDate={formatDate}
        />
        </div>

        <div className="block sm:hidden">
          <SubmissionsCardView
            submissions={submissions.slice(0, 10).map((submission: any) => ({
              id: submission.id,
              job_description: submission.job_description,
              officer_name: submission.officer_name,
              work_location: submission.work_location,
              work_hours: submission.working_hours ?? "", // Fixed: API returns 'working_hours', not 'work_hours'
              approval_status: submission.approval_status,
              review_status: submission.review_status ?? 'PENDING_REVIEW',
              simlok_number: submission.simlok_number,
              created_at: submission.created_at,
            }))}
            loading={submissionsLoading}
            onView={handleViewDetail}
            onDelete={handleDelete}
            formatDate={formatDate}
          />
        </div>
      </Card>

      {selectedSubmission && (
        <SubmissionDetailModal 
          submission={selectedSubmission} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {confirmModal.show && (
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
    </div>
  );
}
