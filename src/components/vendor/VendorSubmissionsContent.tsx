// app/vendor/VendorSubmissionsContent.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { MagnifyingGlassIcon, FunnelIcon, DocumentTextIcon, PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useSubmissionStore } from "@/store/useSubmissionStore";
import { useToast } from "@/hooks/useToast";
import { SubmissionsTable } from "@/components/submissions/SubmissionsTable";
import SubmissionsCardView from "@/components/submissions/SubmissionsCardView";
import SubmissionDetailModal from "./SubmissionDetailModal";
import ConfirmModal from "../ui/modal/ConfirmModal";
import Card from "../ui/Card";
import Button from "../ui/button/Button";
import LoadingSpinner from "../ui/LoadingSpinner";
import { useSocket } from "@/components/common/RealtimeUpdates";

export default function VendorSubmissionsContent() {
  const { showSuccess, showError } = useToast();
  const {
    submissions,
    loading,
    error,
    fetchVendorSubmissions,
    currentPage,
    totalPages,
    setCurrentPage,
    filteredTotal,
    forceRefresh,
    deleteSubmission
  } = useSubmissionStore();

  // Modal states
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
    isLoading: false,
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data with proper debouncing and parameter handling
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params: any = {
        page: currentPage,
        limit: 10,
        sortBy,
        sortOrder,
      };
      
      // Only add non-empty parameters
      if (searchTerm?.trim()) {
        params.search = searchTerm.trim();
      }
      
      if (statusFilter && statusFilter !== '') {
        params.status = statusFilter;
      }
      
      console.log('VendorSubmissions: Fetching with params:', params);
      console.log('Current state:', { 
        currentPage, 
        totalPages, 
        submissionsCount: submissions.length,
        filteredTotal,
        loading 
      });
      
      fetchVendorSubmissions(params);
    }, searchTerm ? 300 : 0); // Shorter debounce for better UX

    return () => clearTimeout(timeoutId);
  }, [fetchVendorSubmissions, currentPage, searchTerm, statusFilter, sortBy, sortOrder]);

  // Socket listener for real-time updates
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;

    socket.emit('join', { role: 'VENDOR' });

    const handleSubmissionUpdate = () => {
      // Force refresh to get updated data when submission status changes
      forceRefresh();
    };

    socket.on('submission:reviewed', handleSubmissionUpdate);
    socket.on('submission:approved', handleSubmissionUpdate);
    socket.on('submission:rejected', handleSubmissionUpdate);

    return () => {
      socket.off('submission:reviewed', handleSubmissionUpdate);
      socket.off('submission:approved', handleSubmissionUpdate);
      socket.off('submission:rejected', handleSubmissionUpdate);
    };
  }, [socket, forceRefresh]);

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
          // Force refresh to ensure UI is updated
          forceRefresh();
        } catch (error) {
          console.error('Error deleting submission:', error);
          showError("Error", "Gagal menghapus pengajuan");
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false,
    });
  }, [submissions, showSuccess, showError, deleteSubmission, forceRefresh]);

  const handleViewDetail = useCallback((submissionRow: any) => {
    // Find the full submission data from the store using the ID
    const fullSubmission = submissions.find(s => s.id === submissionRow.id);
    if (fullSubmission) {
      console.log('VendorSubmissions: Setting full submission data for modal:', fullSubmission);
      setSelectedSubmission(fullSubmission);
      setIsModalOpen(true);
    } else {
      console.error('VendorSubmissions: Could not find full submission data for ID:', submissionRow.id);
    }
  }, [submissions]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when searching
  }, [setCurrentPage]);

  const handleStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, [setCurrentPage]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("");
    setSortBy("created_at");
    setSortOrder("desc");
    setCurrentPage(1);
  }, [setCurrentPage]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kelola Pengajuan SIMLOK</h1>
            <p className="text-gray-600 mt-1">
              Lihat dan kelola semua pengajuan SIMLOK Anda
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-3">
            {/* <Button 
              onClick={async () => {
                try {
                  await forceRefresh();
                } catch (error) {
                  console.error('Refresh error:', error);
                }
              }} 
              variant="secondary" 
              size="md"
              disabled={loading}
            >
              {loading ? 'Memuat...' : '🔄 Refresh'}
            </Button> */}
            <Link href="/vendor/submissions/create">
              <Button variant="primary" size="md">
                <PlusIcon className="w-5 h-5 mr-2" />
                Buat Pengajuan Baru
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari berdasarkan deskripsi pekerjaan, lokasi, atau nomor SIMLOK..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Menunggu</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowFilters(!showFilters)}
            className="sm:w-auto w-full"
          >
            <FunnelIcon className="w-5 h-5 mr-2" />
            Filter
          </Button>

          {/* Clear Filters */}
          {(searchTerm || statusFilter) && (
            <Button
              variant="outline"
              size="md"
              onClick={clearFilters}
              className="sm:w-auto w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              Hapus Filter
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urutkan berdasarkan
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="created_at">Tanggal Dibuat</option>
                  <option value="job_description">Deskripsi Pekerjaan</option>
                  <option value="work_location">Lokasi Kerja</option>
                  <option value="approval_status">Status</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urutan
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="desc">Terbaru ke Terlama</option>
                  <option value="asc">Terlama ke Terbaru</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Results Summary */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <p className="text-sm text-gray-600">
          {loading ? (
            "Memuat data..."
          ) : (
            <>
              Menampilkan {submissions.length === 0 ? 0 : ((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, filteredTotal || 0)} dari {filteredTotal || 0} pengajuan
              
            </>
          )}
        </p>
        
        {/* Sort indicator */}
        {/* <div className="flex items-center text-sm text-gray-500">
          <DocumentTextIcon className="w-4 h-4 mr-1" />
          Diurutkan: {sortBy === 'created_at' ? 'Tanggal' : sortBy === 'job_description' ? 'Deskripsi' : sortBy === 'work_location' ? 'Lokasi' : 'Status'} ({sortOrder === 'desc' ? '↓' : '↑'})
        </div> */}
      </div>

      {/* Content */}
      {error ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Gagal Memuat Data</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <Button 
              variant="primary" 
              onClick={() => {
                console.log('Retry button clicked');
                fetchVendorSubmissions({ page: 1, limit: 10 });
              }}
            >
              Coba Lagi
            </Button>
          </div>
        </Card>
      ) : loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-gray-500">Memuat data pengajuan...</p>
          </div>
        </Card>
      ) : submissions.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter ? 'Tidak ada hasil' : 'Belum ada pengajuan'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter 
                ? 'Coba ubah filter pencarian Anda'
                : 'Mulai dengan membuat pengajuan SIMLOK pertama Anda'
              }
            </p>
            {!searchTerm && !statusFilter && (
              <Link href="/vendor/submissions/create">
                <Button variant="primary">
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Buat Pengajuan Pertama
                </Button>
              </Link>
            )}
            {(searchTerm || statusFilter) && (
              <Button variant="outline" onClick={clearFilters}>
                Hapus Filter
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          <SubmissionsTable
            submissions={submissions.map((s: any) => ({
              id: s.id,
              job_description: s.job_description,
              officer_name: s.officer_name,
              work_location: s.work_location,
              work_hours: s.working_hours ?? "", // Fixed: API returns 'working_hours', not 'work_hours'
              approval_status: s.approval_status,
              review_status: s.review_status ?? 'PENDING_REVIEW',
              simlok_number: s.simlok_number,
              created_at: s.created_at,
            }))}
            loading={loading}
            onView={handleViewDetail}
            onDelete={handleDelete}
            formatDate={formatDate}
          />

          <SubmissionsCardView
            submissions={submissions.map((s: any) => ({
              id: s.id,
              job_description: s.job_description,
              officer_name: s.officer_name,
              work_location: s.work_location,
              work_hours: s.working_hours ?? "", // Fixed: API returns 'working_hours', not 'work_hours'
              approval_status: s.approval_status,
              review_status: s.review_status ?? 'PENDING_REVIEW',
              simlok_number: s.simlok_number,
              created_at: s.created_at,
            }))}
            loading={loading}
            onView={handleViewDetail}
            onDelete={handleDelete}
            formatDate={formatDate}
          />
        </>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && !loading && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Page Info */}
            <div className="text-sm text-gray-600">
              Halaman {currentPage} dari {totalPages} ({filteredTotal} total pengajuan)
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center space-x-2">
              {/* First Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                ««
              </Button>

              {/* Previous Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
              >
                ‹ Prev
              </Button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              {/* Next Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next ›
              </Button>

              {/* Last Page */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                »»
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Modals */}
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
