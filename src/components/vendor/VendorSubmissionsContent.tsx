'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import SubmissionDetailModal from './SubmissionDetailModal';
import Button from '../ui/button/Button';
import Alert from '../ui/alert/Alert';
import { useToast } from '@/hooks/useToast';
import ConfirmModal from '../ui/modal/ConfirmModal';
import LoadingSpinner from '../ui/loading/LoadingSpinner';

interface Submission {
  id: string;
  status_approval_admin: string;
  nama_vendor: string;
  berdasarkan: string;
  nama_petugas: string;
  pekerjaan: string;
  lokasi_kerja: string;
  pelaksanaan: string | null;
  jam_kerja: string;
  lain_lain?: string;
  sarana_kerja: string;
  tembusan?: string;
  nomor_simja?: string;
  tanggal_simja?: string | null;
  nomor_sika?: string;
  tanggal_sika?: string | null;
  nomor_simlok?: string;
  tanggal_simlok?: string | null;
  nama_pekerja: string;
  content: string;
  keterangan?: string;
  upload_doc_sika?: string;
  upload_doc_simja?: string;
  upload_doc_id_card?: string;
  qrcode?: string;
  created_at: string;
  user: {
    id: string;
    nama_petugas: string;
    email: string;
    nama_vendor: string;
  };
  approvedByUser?: {
    id: string;
    nama_petugas: string;
    email: string;
  };
}

type SortField = keyof Submission;
type SortOrder = "asc" | "desc";

// Custom hook untuk debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function VendorSubmissionsContent() {
  const { showSuccess, showError } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [limit] = useState(10);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Alert state
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info', message: string } | null>(null);
  
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

  // Ref untuk search input
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: debouncedSearchTerm,
        sortBy: sortField,
        sortOrder: sortOrder,
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetch(`/api/submissions?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal mengambil data submission");
      }
      
      const data = await response.json();
      setSubmissions(data.submissions);
      setTotalPages(data.pagination.pages);
      setTotalSubmissions(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      console.error('Error fetching submissions:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, statusFilter, sortField, sortOrder, limit]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Kembalikan fokus ke search input setelah data reload
  useEffect(() => {
    if (!loading && isInputFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading, isInputFocused]);

  // Reset ke halaman 1 saat search term berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, sortField, sortOrder]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }, [sortField, sortOrder]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsInputFocused(true);
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Konfirmasi Hapus',
      message: 'Apakah Anda yakin ingin menghapus pengajuan ini? Tindakan ini tidak dapat dibatalkan.',
      onConfirm: () => performDelete(id)
    });
  }, []);

  const performDelete = useCallback(async (id: string) => {
    try {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      
      const response = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menghapus pengajuan');
      }

      // Refresh data setelah berhasil menghapus
      await fetchSubmissions();
      
      // Show success toast
      showSuccess('Berhasil!', 'Pengajuan berhasil dihapus');
    } catch (error) {
      console.error('Error deleting submission:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus pengajuan';
      showError('Error!', errorMessage);
      setAlert({ 
        type: 'error', 
        message: errorMessage
      });
      setTimeout(() => setAlert(null), 5000);
    }
  }, [fetchSubmissions]);

  const handleViewDetail = useCallback((submission: Submission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
  }, []);

  const paginationInfo = useMemo(() => ({
    currentPage,
    totalPages,
    totalSubmissions,
    limit,
    startItem: ((currentPage - 1) * limit) + 1,
    endItem: Math.min(currentPage * limit, totalSubmissions)
  }), [currentPage, totalPages, totalSubmissions, limit]);

  const getSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) {
      return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === "asc" 
      ? <ChevronUpIcon className="w-4 h-4 text-blue-500" />
      : <ChevronDownIcon className="w-4 h-4 text-blue-500" />;
  }, [sortField, sortOrder]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short", 
      day: "numeric"
    });
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    const colors = {
      'PENDING': "bg-yellow-100 text-yellow-800",
      'APPROVED': "bg-green-100 text-green-800",
      'REJECTED': "bg-red-100 text-red-800"
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  }, []);

  // Function to format nama_pekerja for table display
  const formatNamaPekerjaPreview = useCallback((names: string, maxDisplay: number = 2): string => {
    if (!names) return '';
    const namesList = names
      .split(/[\n,]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (namesList.length <= maxDisplay) {
      return namesList.join(', ');
    }
    
    return `${namesList.slice(0, maxDisplay).join(', ')} +${namesList.length - maxDisplay} lainnya`;
  }, []);

  const tableContent = useMemo(() => {
    if (error) {
      return (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{error}</div>
            <button 
              onClick={fetchSubmissions}
              className="mt-2 text-red-600 hover:text-red-500 font-medium"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      );
    }

    if (submissions.length === 0 && !loading) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">Belum ada pengajuan</div>
          <Link href="/vendor/submissions/create">
            <Button 
              variant="primary"
              size="md"
              startIcon={<PlusIcon className="w-4 h-4" />}
            >
              Buat Pengajuan Pertama
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  onClick={() => handleSort("nama_vendor")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Nama Vendor</span>
                    {getSortIcon("nama_vendor")}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("pekerjaan")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Pekerjaan</span>
                    {getSortIcon("pekerjaan")}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lokasi & Waktu
                </th>
                <th 
                  onClick={() => handleSort("status_approval_admin")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {getSortIcon("status_approval_admin")}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("created_at")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Tgl Dibuat</span>
                    {getSortIcon("created_at")}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Keterangan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{submission.nama_vendor}</div>
                    <div className="text-sm text-gray-500">{submission.nama_petugas}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={submission.pekerjaan}>
                      {submission.pekerjaan}
                    </div>
                    <div className="text-sm text-gray-500" title={submission.nama_pekerja}>
                      {formatNamaPekerjaPreview(submission.nama_pekerja)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={submission.lokasi_kerja}>
                      {submission.lokasi_kerja}
                    </div>
                    <div className="text-sm text-gray-500">{submission.pelaksanaan}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(submission.status_approval_admin)}
                    {submission.nomor_simlok && (
                      <div className="text-xs text-gray-500 mt-1">
                        SIMLOK: {submission.nomor_simlok}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(submission.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {submission.keterangan && (
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-600 truncate" title={submission.keterangan}>
                          {submission.keterangan}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleViewDetail(submission)}
                        variant="info"
                        size="sm"
                        title="Lihat Detail"
                      >
                        Lihat
                      </Button>
                      {submission.status_approval_admin === 'PENDING' && (
                        <>
                          <Link href={`/vendor/submissions/edit/${submission.id}`}>
                            <Button
                              variant="warning"
                              size="sm"
                              title="Ubah Pengajuan"
                              className="mr-2"
                            >
                              Ubah
                            </Button>
                          </Link>
                          <Button
                            onClick={() => handleDelete(submission.id)}
                            variant="destructive"
                            size="sm"
                            title="Hapus Pengajuan"
                          >
                            Hapus
                          </Button>
                        </>
                      )}
                      {submission.status_approval_admin !== 'PENDING' && (
                        <span className="text-gray-400 text-xs">Tidak dapat diubah</span>
                      )}
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
  }, [submissions, loading, error, handleSort, getSortIcon, formatDate, getStatusBadge, fetchSubmissions]);

  return (
    <div className="space-y-4">
      {/* Header dengan Search dan Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">Pengajuan SIMLOK Saya</h2>
          <span className="text-sm text-gray-500">({totalSubmissions} pengajuan)</span>
        </div>
        
        <Link href="/vendor/submissions/create">
          <Button 
            variant="primary"
            size="md"
            startIcon={<PlusIcon className="w-4 h-4" />}
          >
            Buat Pengajuan Baru
          </Button>
        </Link>
      </div>

      {/* Search dan Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cari pekerjaan, lokasi, atau pekerja..."
            value={searchTerm}
            onChange={handleSearchChange}
            onBlur={() => setIsInputFocused(false)}
            onFocus={() => setIsInputFocused(true)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={handleStatusFilterChange}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Semua Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Tabel dengan loading overlay */}
      <div className="relative">
        {tableContent}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Menampilkan {paginationInfo.startItem} - {paginationInfo.endItem} dari {paginationInfo.totalSubmissions} pengajuan
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            
            <div className="flex items-center space-x-1">
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 border text-sm font-medium rounded-md ${
                        currentPage === page
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return <span key={page} className="text-gray-500">...</span>;
                }
                return null;
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      <SubmissionDetailModal
        submission={selectedSubmission}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Alert */}
      {alert && (
        <Alert
          variant={alert.type}
          title={alert.type === 'success' ? 'Berhasil!' : alert.type === 'error' ? 'Error!' : 'Info'}
          message={alert.message}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        variant="danger"
      />
    </div>
  );
}
