'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  PencilIcon, 
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  EyeIcon
} from "@heroicons/react/24/outline";

interface Submission {
  id: string;
  status_approval_admin: string;
  nama_vendor: string;
  nama_petugas: string;
  pekerjaan: string;
  lokasi_kerja: string;
  pelaksanaan: string | null;
  nama_pekerja: string;
  created_at: string;
  keterangan?: string;
  nomor_simlok?: string;
  tanggal_simlok?: string;
  tembusan?: string;
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

export default function AdminSubmissions() {
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
  const [showModal, setShowModal] = useState(false);

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

  const handleStatusUpdate = async (submissionId: string, status: string, keterangan?: string, nomor_simlok?: string, tanggal_simlok?: string, tembusan?: string) => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status_approval_admin: status,
          keterangan,
          nomor_simlok,
          tanggal_simlok,
          tembusan,
        }),
      });

      if (!response.ok) throw new Error('Failed to update submission');
      
      fetchSubmissions();
      setShowModal(false);
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Error updating submission:', error);
      alert('Gagal mengupdate status');
    }
  };

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

  // Function to format nama_pekerja for modal display
  const formatNamaPekerjaDisplay = useCallback((names: string): string[] => {
    if (!names) return [];
    return names
      .split(/[\n,]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }, []);

  const openModal = (submission: Submission) => {
    setSelectedSubmission(submission);
    setShowModal(true);
  };

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
          <div className="text-gray-500">Tidak ada pengajuan yang ditemukan</div>
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
                    <span>Vendor</span>
                    {getSortIcon("nama_vendor")}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("nama_petugas")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Petugas</span>
                    {getSortIcon("nama_petugas")}
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
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{submission.nama_vendor}</div>
                    <div className="text-sm text-gray-500">{submission.user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{submission.nama_petugas}</div>
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openModal(submission)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Review Submission"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
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
  }, [submissions, loading, error, handleSort, getSortIcon, formatDate, getStatusBadge, formatNamaPekerjaPreview, formatNamaPekerjaDisplay, openModal, fetchSubmissions]);

  return (
    <div className="space-y-4">
      {/* Header dengan Search dan Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">Kelola Pengajuan SIMLOK</h2>
          <span className="text-sm text-gray-500">({totalSubmissions} pengajuan)</span>
        </div>
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
            placeholder="Cari vendor, petugas, pekerjaan, atau lokasi..."
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

      {/* Modal untuk Review Submission */}
      {showModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Review Pengajuan SIMLOK</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Informasi Pengajuan</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vendor</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSubmission.nama_vendor}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Petugas</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSubmission.nama_petugas}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pekerjaan</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSubmission.pekerjaan}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lokasi</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSubmission.lokasi_kerja}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pelaksanaan</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSubmission.pelaksanaan}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pekerja</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {formatNamaPekerjaDisplay(selectedSubmission.nama_pekerja).map((nama, index) => (
                        <div key={index} className="flex items-start">
                          <span className="w-6 text-gray-600 flex-shrink-0">{index + 1}.</span>
                          <span className="flex-1">{nama}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Status Saat Ini</label>
                    <div className="mt-1">{getStatusBadge(selectedSubmission.status_approval_admin)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Update Status</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const status = formData.get('status') as string;
                  const keterangan = formData.get('keterangan') as string;
                  const nomor_simlok = formData.get('nomor_simlok') as string;
                  const tanggal_simlok = formData.get('tanggal_simlok') as string;
                  const tembusan = formData.get('tembusan') as string;
                  
                  handleStatusUpdate(selectedSubmission.id, status, keterangan, nomor_simlok, tanggal_simlok, tembusan);
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select 
                        name="status" 
                        defaultValue={selectedSubmission.status_approval_admin}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Keterangan</label>
                      <textarea
                        name="keterangan"
                        defaultValue={selectedSubmission.keterangan || ''}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Tambahkan keterangan (opsional)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nomor SIMLOK (jika approved)</label>
                      <input
                        type="text"
                        name="nomor_simlok"
                        defaultValue={selectedSubmission.nomor_simlok || ''}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Masukkan nomor SIMLOK"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tanggal SIMLOK</label>
                      <input
                        type="date"
                        name="tanggal_simlok"
                        defaultValue={selectedSubmission.tanggal_simlok || ''}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tembusan</label>
                      <input
                        type="text"
                        name="tembusan"
                        defaultValue={selectedSubmission.tembusan || ''}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Masukkan tembusan"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setSelectedSubmission(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Batal
                      </button>
                      <button 
                        type="submit"
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
