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
import { useToast } from '@/hooks/useToast';
import ConfirmModal from '../ui/modal/ConfirmModal';
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

// Types already defined in the store

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
  
  // Use Zustand store for realtime submissions data
  const { 
    submissions,
    loading,
    searchTerm,
    sortField,
    sortOrder,
    currentPage,
    totalPages,
    allSubmissionsStats,
    filteredTotal,
    fetchVendorSubmissions,
    fetchVendorStats,
    setSearchTerm,
    setSortField,
    setSortOrder,
    setCurrentPage
  } = useSubmissionStore();
  
  // Initialize Socket.IO connection
  useSocket();
  
  const [error] = useState("");
  
  // Status filter (local state)
  const [statusFilter, setStatusFilter] = useState("");
  const [limit] = useState(10);

  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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

  // Fetch statistics once when component mounts
  useEffect(() => {
    fetchVendorStats();
  }, [fetchVendorStats]);

  // Fetch submissions when filters change
  useEffect(() => {
    const params = {
      page: currentPage,
      limit,
      search: debouncedSearchTerm,
      sortBy: sortField,
      sortOrder,
      ...(statusFilter && { status: statusFilter }),
    };
    
    fetchVendorSubmissions(params);
  }, [currentPage, limit, debouncedSearchTerm, sortField, sortOrder, statusFilter, fetchVendorSubmissions]);

  // Kembalikan fokus ke search input setelah data reload
  useEffect(() => {
    if (!loading && isInputFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading, isInputFocused]);

  // Reset ke halaman 1 saat search term berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter]);

  const handleSort = useCallback((field: string) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  }, [sortField, sortOrder, setSortField, setSortOrder, setCurrentPage]);

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
      const params = {
        page: currentPage,
        limit,
        search: debouncedSearchTerm,
        sortBy: sortField,
        sortOrder,
        ...(statusFilter && { status: statusFilter }),
      };
      
      await fetchVendorSubmissions(params);
      
      showSuccess('Berhasil!', 'Pengajuan berhasil dihapus');
    } catch (error: any) {
      console.error('Error deleting submission:', error);
      showError('Error!', error.message || 'Gagal menghapus pengajuan');
    }
  }, [currentPage, limit, debouncedSearchTerm, sortField, sortOrder, statusFilter, fetchVendorSubmissions, showSuccess, showError]);

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
    filteredTotal,
    limit,
    startItem: ((currentPage - 1) * limit) + 1,
    endItem: Math.min(currentPage * limit, filteredTotal)
  }), [currentPage, totalPages, filteredTotal, limit]);

  const getSortIcon = useCallback((field: string) => {
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
    const statusConfig = {
      'PENDING': { label: "Menunggu", className: "bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full" },
      'APPROVED': { label: "Disetujui", className: "bg-green-100 text-green-700 px-2 py-0.5 rounded-full" },
      'REJECTED': { label: "Ditolak", className: "bg-red-100 text-red-700 px-2 py-0.5 rounded-full" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      className: 'bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full' 
    };
    
    return (
      <span className={`text-xs font-semibold ${config.className}`}>
        {config.label}
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



  return (
    <div className="max-w-7xl mx-auto px-3 md:px-6 space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500">Total</h3>
          <p className="text-2xl font-bold text-blue-600 mt-1">{allSubmissionsStats?.total || 0}</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500">Menunggu</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {allSubmissionsStats?.pending || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500">Disetujui</h3>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {allSubmissionsStats?.approved || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500">Ditolak</h3>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {allSubmissionsStats?.rejected || 0}
          </p>
        </div>
      </div>

      {/* Header */}
       <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Pengajuan Saya</h1>
          {/* <p className="text-sm text-gray-500 mt-1">Daftar Pengajuan SIMLOK ({paginationInfo.totalSubmissions || 0} pengajuan)</p> */}
        </div>
        
        <Link href="/vendor/submissions/create">
          <Button 
            variant="primary"
            size="md"
            startIcon={<PlusIcon className="w-4 h-4" />}
            className="whitespace-nowrap"
          >
            Buat Pengajuan Baru
          </Button>
        </Link>
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
            placeholder="Cari pekerjaan atau petugas…"
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
          <button 
            onClick={() => {
              const params = {
                page: currentPage,
                limit,
                search: debouncedSearchTerm,
                sortBy: sortField,
                sortOrder,
                ...(statusFilter && { status: statusFilter }),
              };
              fetchVendorSubmissions(params);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      ) : submissions.length === 0 && !loading ? (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2h16a2 2 0 002-2v-5m0 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada pengajuan</h3>
          <p className="text-gray-500 mb-6">Buat pengajuan baru untuk memulai</p>
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
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          {/* Loading Skeleton */}
          {loading ? (
            <div className="divide-y">
              {/* Header skeleton */}
              <div className="bg-gray-50/50 p-3">
                <div className="grid grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
              {/* Rows skeleton */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3">
                  <div className="grid grid-cols-5 gap-4 items-center">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="min-w-full table-fixed">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[18%]" />
                    <col className="w-[22%]" />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-200">
                      <th 
                        onClick={() => handleSort("job_description")}
                        className="p-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none transition-colors"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Pekerjaan & Petugas</span>
                          {getSortIcon("job_description")}
                        </div>
                      </th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-900">
                        Sarana Kerja
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
                    {submissions.map((submission: any) => (
                      <tr 
                        key={submission.id} 
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => handleViewDetail(submission)}
                      >
                        <td className="p-3 align-top">
                          <div className="text-sm font-medium text-gray-900 break-words leading-snug">
                            {submission.job_description}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 font-medium">{submission.officer_name}</div>
                          {/* <div className="text-xs text-gray-500 mt-1" title={submission.worker_names}>
                            Pekerja: {formatNamaPekerjaPreview(submission.worker_names, 3)}
                          </div> */}
                        </td>
                        <td className="p-3 align-top">
                          <div className="text-sm text-gray-800 break-words leading-snug">
                            {submission.work_facilities}
                          </div>
                          {/* {submission.other_notes && (
                            <div className="text-xs text-gray-600 mt-1 break-words leading-relaxed">
                              <span className="font-medium">Catatan:</span> {submission.other_notes}
                            </div>
                          )} */}
                        </td>
                        <td className="p-3 align-top">
                          <div className="text-sm text-gray-800 leading-snug">
                            <div className="font-medium break-words">{submission.work_location}</div>
                            {/* {submission.implementation && (
                              <div className="text-xs text-gray-600 mt-1 break-words">
                                <span className="font-medium">Pelaksanaan:</span> {submission.implementation}
                              </div>
                            )} */}
                            {submission.working_hours && (
                              <div className="text-xs text-gray-600 mt-1">
                                <span className="font-medium">Jam:</span> {submission.working_hours}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          <div className="space-y-1">
                            {getStatusBadge(submission.approval_status)}
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          <div className="text-xs text-gray-500">{formatDate(submission.created_at)}</div>

                        </td>
                        <td className="p-3 align-top">
                          <div className="flex items-start gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              onClick={() => handleViewDetail(submission)}
                              variant="info"
                              size="sm"
                              title="Lihat detail submission"
                              className="text-xs "
                            >
                              Lihat
                            </Button>
                            {submission.approval_status === 'PENDING' && (
                              <>
                                <Link href={`/vendor/submissions/edit/${submission.id}`} className="w-full">
                                  <Button
                                    variant="warning"
                                    size="sm"
                                    title="Edit submission"
                                    className="text-xs w-full"
                                  >
                                    Edit
                                  </Button>
                                </Link>
                                <Button 
                                  onClick={() => handleDelete(submission.id)} 
                                  variant="destructive" 
                                  size="sm"
                                  title="Hapus submission ini"
                                  className="text-xs w-full"
                                >
                                  Hapus
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {submissions.map((submission: any) => (
                  <div 
                    key={submission.id}
                    className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(submission)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 break-words leading-snug">{submission.job_description}</h3>
                        <p className="text-sm text-gray-500 font-medium">{submission.officer_name}</p>
                      </div>
                      {getStatusBadge(submission.approval_status)}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          <span className="font-medium">Pekerja:</span> {formatNamaPekerjaPreview(submission.worker_names, 3)}
                        </p>
                        <p className="text-sm text-gray-800 break-words leading-snug">
                          <span className="font-medium">Sarana:</span> {submission.work_facilities}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-800 break-words leading-snug">
                          <span className="font-medium">Lokasi:</span> {submission.work_location}
                        </p>
                        {submission.implementation && (
                          <p className="text-xs text-gray-600 mt-1 break-words">
                            <span className="font-medium">Pelaksanaan:</span> {submission.implementation}
                          </p>
                        )}
                        {submission.working_hours && (
                          <p className="text-xs text-gray-600 mt-1">
                            <span className="font-medium">Jam Kerja:</span> {submission.working_hours}
                          </p>
                        )}
                      </div>

                      {(submission.other_notes || submission.notes) && (
                        <div className="bg-gray-50 rounded-lg p-2">
                          {submission.other_notes && (
                            <p className="text-xs text-gray-600 break-words leading-relaxed">
                              <span className="font-medium">Catatan Lain:</span> {submission.other_notes}
                            </p>
                          )}
                          {submission.notes && (
                            <p className="text-xs text-gray-600 break-words leading-relaxed mt-1">
                              <span className="font-medium">Catatan Admin:</span> {submission.notes}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{formatDate(submission.created_at)}</span>
                        <div className="text-right">
                          {submission.simlok_number && (
                            <div>SIMLOK: {submission.simlok_number}</div>
                          )}
                          {submission.sika_number && (
                            <div>SIKA: {submission.sika_number}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          onClick={() => handleViewDetail(submission)}
                          variant="info"
                          size="sm"
                          className="text-xs flex-1"
                        >
                          Lihat Detail
                        </Button>
                        {submission.approval_status === 'PENDING' && (
                          <>
                            <Link href={`/vendor/submissions/edit/${submission.id}`}>
                              <Button
                                variant="warning"
                                size="sm"
                                className="text-xs"
                              >
                                Edit
                              </Button>
                            </Link>
                            <Button 
                              onClick={() => handleDelete(submission.id)} 
                              variant="destructive" 
                              size="sm"
                              className="text-xs"
                            >
                              Hapus
                            </Button>
                          </>
                        )}
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
              <span>{paginationInfo.startItem} - {paginationInfo.endItem} dari {paginationInfo.filteredTotal}</span>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage((prev: number) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ←
                </button>
                
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
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return <span key={page} className="text-gray-400 px-1">…</span>;
                  }
                  return null;
                })}
                
                <button
                  onClick={() => setCurrentPage((prev: number) => Math.min(prev + 1, totalPages))}
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
      <SubmissionDetailModal
        submission={selectedSubmission}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
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
    </div>
  );
}
