'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";

import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/Badge';
import Alert from '@/components/ui/alert/Alert';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import AdminSubmissionDetailModal from './AdminSubmissionDetailModal';
import TableLoader from '@/components/ui/TableLoader';
import ExportModal from './ExportModal';
import { useSubmissionStore } from '@/store/useSubmissionStore';
import { useSocket } from '@/components/common/RealtimeUpdates';

interface Submission {
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
  // tembusan?: string;
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

// Types already defined in store

// Custom hook untuk debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Statistics interface removed (using store types)

export default function SubmissionsManagement() {
  // Use Zustand store for realtime submissions data
  const {
    submissions,
    loading,
    statistics,
    allSubmissionsStats,
    filteredTotal,
    searchTerm,
    sortField,
    sortOrder,
    currentPage,
    totalPages,
    fetchSubmissions,
    fetchAdminStats,
    setSearchTerm,
    setSortField,
    setSortOrder,
    setCurrentPage
  } = useSubmissionStore();

  // Initialize Socket.IO connection
  useSocket();

  const [error] = useState("");

  // Alert state
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    show: false,
    variant: 'success',
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
    onConfirm: () => { }
  });

  // Modal detail state
  const [selectedDetailSubmission, setSelectedDetailSubmission] = useState<Submission | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Status filter (this is not in store yet, keep local)
  const [statusFilter, setStatusFilter] = useState("");
  const [limit] = useState(10);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch submissions when filters change
  useEffect(() => {
    const params = {
      page: currentPage,
      limit,
      search: debouncedSearchTerm,
      sortBy: sortField,
      sortOrder,
      stats: true,
      ...(statusFilter && { status: statusFilter }),
    };

    console.log('Admin fetching submissions with params:', params); // Debug log
    fetchSubmissions(params);
  }, [currentPage, limit, debouncedSearchTerm, sortField, sortOrder, statusFilter, fetchSubmissions]);

  // Debug log for statistics
  useEffect(() => {
    console.log('Admin statistics updated:', statistics);
  }, [statistics]);

  // Fetch admin statistics once when component mounts
  useEffect(() => {
    fetchAdminStats();
  }, [fetchAdminStats]);

  useEffect(() => {
    if (!loading && isInputFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading, isInputFocused]);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }, [sortField, sortOrder, setSortField, setSortOrder]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsInputFocused(true);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleViewDetail = useCallback((submission: Submission) => {
    setSelectedDetailSubmission(submission);
    setIsDetailModalOpen(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedDetailSubmission(null);
  }, []);

  const handleSubmissionUpdate = useCallback((updatedSubmission: Submission) => {
    // Update selected submission jika masih dipilih
    if (selectedDetailSubmission?.id === updatedSubmission.id) {
      setSelectedDetailSubmission(updatedSubmission);
    }

    // Refresh data dari server untuk update real-time
    const params = {
      page: currentPage,
      limit,
      search: debouncedSearchTerm,
      sortBy: sortField,
      sortOrder,
      stats: true,
      ...(statusFilter && { status: statusFilter }),
    };

    fetchSubmissions(params);
  }, [selectedDetailSubmission, fetchSubmissions, currentPage, limit, debouncedSearchTerm, sortField, sortOrder, statusFilter]);

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Submission',
      message: 'Apakah Anda yakin ingin menghapus submission ini? Tindakan ini tidak dapat dibatalkan.',
      onConfirm: () => performDelete(id)
    });
  };

  const performDelete = async (id: string) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));

    try {
      const response = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete submission');
      }

      // Refresh submissions after successful deletion
      await fetchSubmissions();

      // Show success message
      setAlert({
        show: true,
        variant: 'success',
        title: 'Berhasil!',
        message: 'Submission berhasil dihapus'
      });

      // Auto hide after 3 seconds
      setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 3000);

    } catch (error) {
      console.error('Error deleting submission:', error);

      // Show error message
      setAlert({
        show: true,
        variant: 'error',
        title: 'Gagal Menghapus',
        message: error instanceof Error ? error.message : 'Gagal menghapus submission. Silahkan coba lagi.'
      });

      // Auto hide after 5 seconds
      setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 5000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="warning">Menunggu Review</Badge>;
      case 'APPROVED': return <Badge variant="success">Disetujui</Badge>;
      case 'REJECTED': return <Badge variant="destructive">Ditolak</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
    return sortOrder === "asc"
      ? <ChevronUpIcon className="w-4 h-4 text-blue-500" />
      : <ChevronDownIcon className="w-4 h-4 text-blue-500" />;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });

  // Function to format nama_pekerja for table display
  const formatNamaPekerjaPreview = (names: string, maxDisplay: number = 2): string => {
    if (!names) return '';
    const namesList = names
      .split(/[\n,]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (namesList.length <= maxDisplay) {
      return namesList.join(', ');
    }

    return `${namesList.slice(0, maxDisplay).join(', ')} +${namesList.length - maxDisplay} lainnya`;
  };



  return (
    <div className="max-w-7xl mx-auto px-3 md:px-6 space-y-6">
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

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500">Total</h3>
          <p className="text-2xl font-bold text-blue-600 mt-1">{allSubmissionsStats?.total || 0}</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500">Menunggu</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{allSubmissionsStats?.pending || 0}</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500">Disetujui</h3>
          <p className="text-2xl font-bold text-green-600 mt-1">{allSubmissionsStats?.approved || 0}</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500">Ditolak</h3>
          <p className="text-2xl font-bold text-red-600 mt-1">{allSubmissionsStats?.rejected || 0}</p>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Kelola Pengajuan</h1>
            {/* <p className="text-sm text-gray-500 mt-1">Manajemen Pengajuan SIMLOK ({statistics?.total || 0} pengajuan)</p> */}
          </div>

          <Button
            onClick={() => setShowExportModal(true)}
            variant="outline"
            size="md"
            startIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 whitespace-nowrap"
          >
            Export Excel
          </Button>
        </div>

        {/* Toolbar - Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari vendor, petugas, atau pekerjaan…"
              value={searchTerm}
              onChange={handleSearchChange}
              onBlur={() => setIsInputFocused(false)}
              onFocus={() => setIsInputFocused(true)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="w-44 px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="">Semua</option>
            <option value="APPROVED">Disetujui</option>
            <option value="REJECTED">Ditolak</option>
            <option value="PENDING">Menunggu</option>
          </select>
        </div>

      </div>
      {/* Content */}
      {error ? (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Gagal memuat data pengajuan</h3>
          <p className="text-gray-500 mb-4">Periksa koneksi atau coba ulang</p>
          <Button
            onClick={fetchSubmissions}
            variant="primary"
            size="md"
          >
            Coba Lagi
          </Button>
        </div>
      ) : submissions.length === 0 && !loading ? (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2h16a2 2 0 002-2v-5m0 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada pengajuan</h3>
          <p className="text-gray-500">Tidak ada pengajuan yang ditemukan dengan filter saat ini</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          {loading ? (
            <TableLoader rows={5} columns={6} showHeader={true} />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-200">
                      <th
                        onClick={() => handleSort("vendor_name")}
                        className="p-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Nama Vendor</span>
                          {getSortIcon("vendor_name")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("job_description")}
                        className="p-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Pekerjaan</span>
                          {getSortIcon("job_description")}
                        </div>
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-900">
                        Lokasi & Waktu
                      </th>
                      <th
                        onClick={() => handleSort("approval_status")}
                        className="p-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          {getSortIcon("approval_status")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("created_at")}
                        className="p-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Tanggal</span>
                          {getSortIcon("created_at")}
                        </div>
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-900">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {submissions.map((s: any) => (
                      <tr
                        key={s.id}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => handleViewDetail(s)}
                      >
                        <td className="p-3 align-top">
                          <div className="font-medium text-gray-900">{s.vendor_name}</div>
                          <div className="text-sm text-gray-500">{s.officer_name}</div>
                        </td>
                        <td className="p-3 align-top">
                          <div className="text-sm text-gray-900 max-w-[200px] break-words leading-snug">
                            {s.job_description}
                          </div>
                          {/* <div className="text-xs text-gray-500 mt-1" title={s.worker_names}>
                            {formatNamaPekerjaPreview(s.worker_names)}
                          </div> */}
                        </td>
                        <td className="p-3 align-top">
                          <div className="whitespace-pre-line break-words max-w-[280px] text-sm text-gray-800 leading-snug">
                            <div className="font-medium">{s.work_location}</div>
                            {s.working_hours && (
                              <div className="text-xs text-gray-600 mt-1">{s.working_hours}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          {getStatusBadge(s.approval_status)}
                          {/* {s.simlok_number && (
                            <div className="text-xs text-gray-500 mt-1">
                              SIMLOK: {s.simlok_number}
                            </div>
                          )} */}
                        </td>
                        <td className="p-3 align-top">
                          <div className="text-xs text-gray-500 whitespace-nowrap">{formatDate(s.created_at)}</div>
                        </td>
                        <td className="p-3 align-top">
                          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              onClick={() => handleViewDetail(s)}
                              variant="info"
                              size="sm"
                              title="Lihat detail submission"
                              className="text-xs"
                            >
                              Lihat
                            </Button>

                            <Button
                              onClick={() => handleDelete(s.id)}
                              variant="destructive"
                              size="sm"
                              title="Hapus submission ini"
                              className="text-xs"
                            >
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {submissions.map((s: any) => (
                  <div
                    key={s.id}
                    className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(s)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{s.vendor_name}</h3>
                        <p className="text-sm text-gray-500">{s.officer_name}</p>
                      </div>
                      {getStatusBadge(s.approval_status)}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.job_description}</p>
                        <p className="text-xs text-gray-500">{formatNamaPekerjaPreview(s.worker_names)}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-800 whitespace-pre-line break-words leading-snug">
                          {s.work_location}
                          {s.working_hours && ` • ${s.working_hours}`}
                          {s.implementation && ` • ${s.implementation}`}
                        </p>
                      </div>

                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{formatDate(s.created_at)}</span>
                        {s.simlok_number && (
                          <span>SIMLOK: {s.simlok_number}</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 pt-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          onClick={() => handleViewDetail(s)}
                          variant="info"
                          size="sm"
                          className="text-xs flex-1"
                        >
                          Lihat Detail
                        </Button>
                        <Button
                          onClick={() => handleDelete(s.id)}
                          variant="destructive"
                          size="sm"
                          className="text-xs"
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Footer with Pagination */}
          {totalPages > 1 && !loading && (
            <div className="flex items-center justify-between text-sm text-gray-500 p-3 border-t">
              <span>{((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, filteredTotal)} dari {filteredTotal}</span>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((p: number) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ←
                </button>

                <span className="px-3 py-1.5 text-gray-700">Halaman {currentPage} dari {totalPages}</span>

                <button
                  onClick={() => setCurrentPage((p: number) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Detail */}
      <AdminSubmissionDetailModal
        submission={selectedDetailSubmission}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onSubmissionUpdate={handleSubmissionUpdate}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        variant="danger"
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
}