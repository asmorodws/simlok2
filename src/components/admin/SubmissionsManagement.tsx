'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";
import Card from '@/components/ui/Card';
import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/Badge';
import Alert from '@/components/ui/alert/Alert';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import AdminSubmissionDetailModal from './AdminSubmissionDetailModal';
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
    searchTerm,
    sortField,
    sortOrder,
    currentPage,
    totalPages,
    fetchSubmissions,
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
    onConfirm: () => {}
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
    
    fetchSubmissions(params);
  }, [currentPage, limit, debouncedSearchTerm, sortField, sortOrder, statusFilter, fetchSubmissions]);

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

  const tableContent = useMemo(() => {
    if (error) {
      return (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{error}</div>
            <Button 
              onClick={fetchSubmissions} 
              variant="destructive"
              size="sm"
              className="mt-2"
            >
              Coba Lagi
            </Button>
          </div>
        </div>
      );
    }

    if (submissions.length === 0 && !loading) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500">Tidak ada submission yang ditemukan</div>
        </div>
      );
    }

    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th onClick={() => handleSort("vendor_name")} className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100">
                  <div className="flex items-center space-x-1"><span>Nama Vendor</span>{getSortIcon("vendor_name")}</div>
                </th>
                <th onClick={() => handleSort("job_description")} className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100">
                  <div className="flex items-center space-x-1"><span>Pekerjaan</span>{getSortIcon("job_description")}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi & Waktu</th>
                <th onClick={() => handleSort("approval_status")} className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100">
                  <div className="flex items-center space-x-1"><span>Status</span>{getSortIcon("approval_status")}</div>
                </th>
                <th onClick={() => handleSort("created_at")} className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100">
                  <div className="flex items-center space-x-1"><span>Tgl Dibuat</span>{getSortIcon("created_at")}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{s.vendor_name}</div>
                    <div className="text-sm text-gray-500">{s.officer_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={s.job_description}>{s.job_description}</div>
                    <div className="text-sm text-gray-500" title={s.worker_names}>
                      {formatNamaPekerjaPreview(s.worker_names)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={s.work_location}>{s.work_location}</div>
                    <div className="text-sm text-gray-500">{s.working_hours}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(s.approval_status)}
                    {s.simlok_number && <div className="text-xs text-gray-500 mt-1">SIMLOK: {s.simlok_number}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(s.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
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
        {loading && (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
    );
  }, [submissions, loading, error, handleSort, getSortIcon, formatDate, getStatusBadge, formatNamaPekerjaPreview, handleDelete]);

  return (
    <div className="space-y-4">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card><div className="p-4"><h3 className="text-lg font-semibold">Total</h3><p className="text-2xl font-bold text-blue-600">{statistics?.total || 0}</p></div></Card>
        <Card><div className="p-4"><h3 className="text-lg font-semibold">Pending</h3><p className="text-2xl font-bold text-yellow-600">{statistics?.pending || 0}</p></div></Card>
        <Card><div className="p-4"><h3 className="text-lg font-semibold">Approved</h3><p className="text-2xl font-bold text-green-600">{statistics?.approved || 0}</p></div></Card>
        <Card><div className="p-4"><h3 className="text-lg font-semibold">Rejected</h3><p className="text-2xl font-bold text-red-600">{statistics?.rejected || 0}</p></div></Card>
      </div>

      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Kelola Submissions</h2>
            <span className="text-sm text-gray-500">({statistics?.total || 0} submissions)</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowExportModal(true)}
              variant="outline"
              size="sm"
              className="bg-green-900 inline-flex items-center"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cari vendor, petugas, atau pekerjaan..."
            value={searchTerm}
            onChange={handleSearchChange}
            onBlur={() => setIsInputFocused(false)}
            onFocus={() => setIsInputFocused(true)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={handleStatusFilterChange}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Semua Status</option>
          <option value="PENDING">Menunggu Review</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REJECTED">Ditolak</option>
        </select>
        </div>
      </div>

      {/* Tabel */}
      <div className="relative">
        {tableContent}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Menampilkan {((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, statistics?.total || 0)} dari {statistics?.total || 0} submission
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p: number) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <span className="text-sm text-gray-700">Halaman {currentPage} dari {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p: number) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
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