'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Button from '@/components/ui/button/Button';
import Card from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { 
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  XMarkIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  ShieldCheckIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  officer_name: string;
  vendor_name: string;
  address?: string;
  phone_number?: string;
  profile_photo?: string;
  created_at: string;
  verified_at?: string;
  verified_by?: string;
  role: string;
}

interface Stats {
  totalPending: number;
  totalVerified: number;
  totalUsers: number;
  todayRegistrations: number;
}

interface UserVerificationManagementProps {
  className?: string;
  refreshTrigger?: number;
}

type SortField = keyof User;
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

export default function UserVerificationManagement({ className = '', refreshTrigger = 0 }: UserVerificationManagementProps) {
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPending: 0,
    totalVerified: 0,
    totalUsers: 0,
    todayRegistrations: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [limit] = useState(10);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified">("all");
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<'approve' | 'reject' | null>(null);
  const [verificationNote, setVerificationNote] = useState('');

  // Ref untuk search input
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Socket.IO has been replaced with Server-Sent Events

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy: sortField,
        sortOrder: sortOrder,
      });

      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm);
      }
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/reviewer/users?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal mengambil data user");
      }

      const data = await response.json();
      setUsers(data.users);
      setStats(data.stats);
      setTotalPages(data.pagination.totalPages);
      setTotalUsers(data.pagination.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, statusFilter, sortField, sortOrder, limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  // Socket.IO functionality removed - using Server-Sent Events instead

  // Reset ke halaman 1 saat search term berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, sortField, sortOrder]);

  // Kembalikan fokus ke search input setelah data reload
  useEffect(() => {
    if (!loading && isInputFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading, isInputFocused]);

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

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
    setSortField("created_at");
    setSortOrder("desc");
  }, []);

  const getSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) {
      return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === "asc" 
      ? <ChevronUpIcon className="w-4 h-4 text-blue-500" />
      : <ChevronDownIcon className="w-4 h-4 text-blue-500" />;
  }, [sortField, sortOrder]);

  const formatDate = useCallback((dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short", 
      day: "numeric"
    });
  }, []);



  const getRoleBadge = useCallback((role: string) => {
    const colors: Record<string, string> = {
      VENDOR: "bg-green-100 text-green-800",
      VERIFIER: "bg-blue-100 text-blue-800",
      REVIEWER: "bg-yellow-100 text-yellow-800",
      APPROVER: "bg-orange-100 text-orange-800",
      ADMIN: "bg-purple-100 text-purple-800",
      SUPER_ADMIN: "bg-red-100 text-red-800"
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[role] || 'bg-gray-100 text-gray-800'}`}>
        {role}
      </span>
    );
  }, []);

  const getVerificationStatus = useCallback((verified_at?: string | Date | null) => {
    if (verified_at) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          Terverifikasi
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-warning-100 text-warning-800">
        Menunggu Verifikasi
      </span>
    );
  }, []);

  const paginationInfo = useMemo(() => ({
    currentPage,
    totalPages,
    totalUsers,
    limit,
    startItem: ((currentPage - 1) * limit) + 1,
    endItem: Math.min(currentPage * limit, totalUsers)
  }), [currentPage, totalPages, totalUsers, limit]);

  const handleVerifyUser = async (action: 'approve' | 'reject') => {
    if (!selectedUser) return;
    
    setProcessing(selectedUser.id);
    
    try {
      const response = await fetch(`/api/reviewer/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'approve' ? 'VERIFY' : 'REJECT',
          note: verificationNote.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user verification');
      }

      await fetchUsers();
      setShowConfirmModal(null);
      setShowVerificationModal(false);
      setSelectedUser(null);
      setVerificationNote('');
      
      showSuccess('Berhasil', action === 'approve' ? 'User berhasil diverifikasi' : 'User berhasil ditolak');
      
    } catch (error) {
      console.error('Error updating user verification:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to update user verification');
    } finally {
      setProcessing(null);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setVerificationNote('');
    setShowVerificationModal(true);
  };

  const handleModalClose = () => {
    setShowVerificationModal(false);
    setShowConfirmModal(null);
    setSelectedUser(null);
    setVerificationNote('');
  };

  // Memoize tabel content untuk hanya reload bagian ini
  const tableContent = useMemo(() => {
    if (error) {
      return (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{error}</div>
            <Button 
              onClick={fetchUsers}
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

    if (users.length === 0 && !loading) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500">Tidak ada user yang ditemukan</div>
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
                  onClick={() => handleSort("officer_name")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Nama Petugas</span>
                    {getSortIcon("officer_name")}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("email")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Email</span>
                    {getSortIcon("email")}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("role")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Role</span>
                    {getSortIcon("role")}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor/Kontak
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.officer_name}</div>
                    {user.address && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{user.address}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.vendor_name || "-"}
                    </div>
                    {user.phone_number && (
                      <div className="text-sm text-gray-500">{user.phone_number}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(user.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getVerificationStatus(user.verified_at)}
                    {user.verified_by && (
                      <div className="text-xs text-gray-500 mt-1">
                        oleh: {user.verified_by}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        onClick={() => handleViewUser(user)}
                        variant="info"
                        size="sm"
                        className="px-3 py-1.5"
                      >
                        Lihat
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
  }, [users, loading, error, handleSort, getSortIcon, formatDate, getRoleBadge, getVerificationStatus, handleViewUser, fetchUsers]);

  if (loading && users.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistics Cards - Dashboard Design */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Menunggu Verifikasi</h3>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.totalPending}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <ClockIcon className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Terverifikasi</h3>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.totalVerified}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total User</h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Registrasi Hari Ini</h3>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.todayRegistrations}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <UserIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
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
            placeholder="Cari nama, email, vendor, atau nomor telepon..."
            value={searchTerm}
            onChange={handleSearchChange}
            onBlur={() => setIsInputFocused(false)}
            onFocus={() => setIsInputFocused(true)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            const newValue = e.target.value as "all" | "pending" | "verified";
            setStatusFilter(newValue);
            setCurrentPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Belum Verifikasi</option>
          <option value="verified">Sudah Verifikasi</option>
        </select>
        
        <Button
          onClick={resetFilters}
          variant="outline"
          size="sm"
          className="px-3 py-2"
        >
          Reset Filter
        </Button>
      </div>

      {/* Tabel dengan loading overlay */}
      <div className="relative">
        {tableContent}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Menampilkan {paginationInfo.startItem} - {paginationInfo.endItem} dari {paginationInfo.totalUsers} user
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

      {/* User Verification Modal */}
      {showVerificationModal && selectedUser && (
        <UserVerificationModal
          isOpen={showVerificationModal}
          onClose={handleModalClose}
          user={selectedUser}
          isProcessing={processing === selectedUser.id}
          onApprove={() => setShowConfirmModal('approve')}
          onReject={() => setShowConfirmModal('reject')}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedUser && (
        <ConfirmationModal
          isOpen={!!showConfirmModal}
          onClose={() => setShowConfirmModal(null)}
          user={selectedUser}
          action={showConfirmModal}
          isProcessing={processing === selectedUser.id}
          onConfirm={() => handleVerifyUser(showConfirmModal)}
        />
      )}
    </div>
  );
}

// Modal Komponen untuk Verifikasi User (mirip dengan admin)
interface UserVerificationModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  isProcessing: boolean;
  onApprove: () => void;
  onReject: () => void;
}

function UserVerificationModal({
  user,
  isOpen,
  onClose,
  isProcessing,
  onApprove,
  onReject
}: UserVerificationModalProps) {
  if (!isOpen || !user) return null;

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isVerified = !!user.verified_at;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <Card className="shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mr-4">
                <UserIcon className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Detail User
                </h2>
                <p className="text-sm text-gray-500">
                  Informasi lengkap dan status verifikasi
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            <div className="space-y-8">
              {/* Status Section */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                    isVerified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-warning-100 text-warning-800'
                  }`}>
                    {isVerified ? (
                      <CheckCircleIcon className="w-4 h-4" />
                    ) : (
                      <ClockIcon className="w-4 h-4" />
                    )}
                    {isVerified ? 'Terverifikasi' : 'Menunggu Verifikasi'}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user.role === 'VENDOR' 
                      ? 'bg-blue-100 text-blue-800' 
                      : user.role === 'VERIFIER'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <IdentificationIcon className="w-4 h-4 inline mr-1" />
                    {user.role}
                  </div>
                </div>
              </div>

              {/* User Info Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Personal Information */}
                <Card className="bg-gray-50">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                      <UserIcon className="w-5 h-5 mr-2 text-gray-500" />
                      Informasi Personal
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                          <UserIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-500">Nama Petugas</p>
                          <p className="text-base font-medium text-gray-900 break-words">
                            {user.officer_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                          <EnvelopeIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-500">Email</p>
                          <p className="text-base font-medium text-gray-900 break-words">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {user.phone_number && (
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                            <PhoneIcon className="w-5 h-5 text-orange-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500">No. Telepon</p>
                            <p className="text-base font-medium text-gray-900">
                              {user.phone_number}
                            </p>
                          </div>
                        </div>
                      )}

                      {user.address && (
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                            <MapPinIcon className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500">Alamat</p>
                            <p className="text-base font-medium text-gray-900 break-words">
                              {user.address}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* System Information */}
                <Card className="bg-gray-50">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                      <ShieldCheckIcon className="w-5 h-5 mr-2 text-gray-500" />
                      Informasi Sistem
                    </h3>

                    <div className="space-y-4">
                      {user.vendor_name && (
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                            <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500">Nama Vendor</p>
                            <p className="text-base font-medium text-gray-900 break-words">
                              {user.vendor_name}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                          <ClockIcon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-500">Tanggal Daftar</p>
                          <p className="text-base font-medium text-gray-900">
                            {formatDate(user.created_at)}
                          </p>
                        </div>
                      </div>

                      {isVerified && user.verified_at && (
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                            <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500">Diverifikasi Pada</p>
                            <p className="text-base font-medium text-gray-900">
                              {formatDate(user.verified_at)}
                            </p>
                            {user.verified_by && (
                              <p className="text-sm text-gray-600 mt-1">
                                oleh: {user.verified_by}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Actions for Unverified Users */}
              {!isVerified && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CheckCircleIcon className="w-5 h-5 mr-2 text-blue-600" />
                      Tindakan Verifikasi
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Pilih tindakan yang sesuai untuk user ini. Persetujuan akan memberikan akses sistem, 
                      sedangkan penolakan akan menghapus user dari sistem.
                    </p>


                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        onClick={onApprove}
                        disabled={isProcessing}
                        variant="primary"
                        size="md"
                        className="flex-1"
                      >
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        Setujui User
                      </Button>
                      <Button
                        onClick={onReject}
                        disabled={isProcessing}
                        variant="destructive"
                        size="md"
                        className="flex-1"
                      >
                        <XCircleIcon className="w-5 h-5 mr-2" />
                        Tolak User
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Verification Status Info */}
              {isVerified && (
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="p-6">
                    <div className="flex items-start">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                        <CheckCircleIcon className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-green-900 mb-2">
                          User Sudah Terverifikasi
                        </h4>
                        <p className="text-green-700">
                          User ini sudah dapat mengakses sistem sesuai dengan role yang diberikan dan 
                          memiliki akses penuh ke fitur yang tersedia.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200">
            <Button onClick={onClose} variant="outline" size="md">
              Tutup
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Modal Konfirmasi
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  action: 'approve' | 'reject';
  isProcessing: boolean;
  onConfirm: () => void;
}

function ConfirmationModal({ isOpen, onClose, user, action, isProcessing, onConfirm }: ConfirmationModalProps) {
  if (!isOpen) return null;

  const isApprove = action === 'approve';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <Card className="max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isApprove ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {isApprove ? (
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              ) : (
                <XCircleIcon className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Konfirmasi {isApprove ? 'Persetujuan' : 'Penolakan'}
              </h3>
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            Apakah Anda yakin ingin {isApprove ? 'menyetujui' : 'menolak'} user{' '}
            <strong className="text-gray-900">{user.officer_name}</strong>?
          </p>

          {!isApprove && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-red-800 mb-1">Peringatan!</p>
                  <p className="text-red-700">
                    User akan dihapus dari sistem dan tidak dapat login lagi.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isProcessing}
              variant={isApprove ? "primary" : "destructive"}
              size="sm"
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Memproses...
                </span>
              ) : (
                `Ya, ${isApprove ? 'Setujui' : 'Tolak'}`
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}