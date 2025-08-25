'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon
} from "@heroicons/react/24/outline";;
import Card from '@/components/ui/Card';
import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/Badge';
import Alert from '@/components/ui/alert/Alert';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import AdminSubmissionDetailModal from './AdminSubmissionDetailModal';

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
  jabatan_signer?: string;
  nama_signer?: string;
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
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface Statistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
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
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
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
        stats: 'true',
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetch(`/api/submissions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch submissions');

      const data = await response.json();
      setSubmissions(data.submissions);
      setStatistics(data.statistics);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, statusFilter, sortField, sortOrder, limit]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    if (!loading && isInputFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading, isInputFocused]);

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
    // Update submission di state lokal
    setSubmissions(prev => 
      prev.map(sub => 
        sub.id === updatedSubmission.id ? updatedSubmission : sub
      )
    );
    
    // Update selected submission jika masih dipilih
    if (selectedDetailSubmission?.id === updatedSubmission.id) {
      setSelectedDetailSubmission(updatedSubmission);
    }
    
    // Refresh data untuk update statistik
    fetchSubmissions();
  }, [selectedDetailSubmission, fetchSubmissions]);

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
      case 'PENDING': return <Badge variant="warning">Pending</Badge>;
      case 'APPROVED': return <Badge variant="success">Approved</Badge>;
      case 'REJECTED': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getSortIcon = (field: SortField) => {
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
                <th onClick={() => handleSort("nama_vendor")} className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100">
                  <div className="flex items-center space-x-1"><span>Nama Vendor</span>{getSortIcon("nama_vendor")}</div>
                </th>
                <th onClick={() => handleSort("pekerjaan")} className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100">
                  <div className="flex items-center space-x-1"><span>Pekerjaan</span>{getSortIcon("pekerjaan")}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi & Waktu</th>
                <th onClick={() => handleSort("status_approval_admin")} className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100">
                  <div className="flex items-center space-x-1"><span>Status</span>{getSortIcon("status_approval_admin")}</div>
                </th>
                <th onClick={() => handleSort("created_at")} className="cursor-pointer px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100">
                  <div className="flex items-center space-x-1"><span>Tgl Dibuat</span>{getSortIcon("created_at")}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{s.nama_vendor}</div>
                    <div className="text-sm text-gray-500">{s.nama_petugas}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={s.pekerjaan}>{s.pekerjaan}</div>
                    <div className="text-sm text-gray-500" title={s.nama_pekerja}>
                      {formatNamaPekerjaPreview(s.nama_pekerja)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 max-w-xs truncate" title={s.lokasi_kerja}>{s.lokasi_kerja}</div>
                    <div className="text-sm text-gray-500">{s.jam_kerja}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(s.status_approval_admin)}
                    {s.nomor_simlok && <div className="text-xs text-gray-500 mt-1">SIMLOK: {s.nomor_simlok}</div>}
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
        <Card><div className="p-4"><h3 className="text-lg font-semibold">Total</h3><p className="text-2xl font-bold text-blue-600">{statistics.total}</p></div></Card>
        <Card><div className="p-4"><h3 className="text-lg font-semibold">Pending</h3><p className="text-2xl font-bold text-yellow-600">{statistics.pending}</p></div></Card>
        <Card><div className="p-4"><h3 className="text-lg font-semibold">Approved</h3><p className="text-2xl font-bold text-green-600">{statistics.approved}</p></div></Card>
        <Card><div className="p-4"><h3 className="text-lg font-semibold">Rejected</h3><p className="text-2xl font-bold text-red-600">{statistics.rejected}</p></div></Card>
      </div>

      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Kelola Submissions</h2>
            <span className="text-sm text-gray-500">({statistics.total} submissions)</span>
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
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
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
            Menampilkan {((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, statistics.total)} dari {statistics.total} submission
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <span className="text-sm text-gray-700">Halaman {currentPage} dari {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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
    </div>
  );
}