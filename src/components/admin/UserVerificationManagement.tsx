'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// ⛔️ Hapus import Button external agar seragam di file ini
// import Button from '@/components/ui/button/Button';
import { useToast } from '@/hooks/useToast';
import { useSession } from 'next-auth/react';
import ReviewerUserVerificationModal from '../reviewer/ReviewerUserVerificationModal';
import EditUserModal from './EditUserModal';
import DeleteUserModal from './DeleteUserModal';
import CreateUserModal from './CreateUserModal';
import {
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  UserPlusIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { UserData } from '@/types';

interface Stats {
  totalPending: number;
  totalVerified: number;
  totalRejected: number;
  totalUsers: number;
  todayRegistrations: number;
}

interface UserVerificationManagementProps {
  className?: string;
  refreshTrigger?: number;
}

type SortField = keyof UserData;
type SortOrder = 'asc' | 'desc';

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

export default function UserVerificationManagement({
  className = '',
  refreshTrigger = 0,
}: UserVerificationManagementProps) {
  const { showSuccess } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPending: 0,
    totalVerified: 0,
    totalRejected: 0,
    totalUsers: 0,
    todayRegistrations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Role guard - get from session
  const currentUserRole = session?.user?.role;
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [limit] = useState(10);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // Search focus retainer
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // ======= SIMPLE BUTTON STYLES (dibesarkan, inline) =======
  const btnBase =
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  // ukuran tombol tabel dibesarkan dari text-xs -> text-sm, padding juga ditambah
  const btnText = 'text-sm';
  const btnLink = `${btnBase} ${btnText} text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-400 px-3 py-2`;
  const btnNeutral = `${btnBase} ${btnText} text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 focus-visible:ring-gray-400 px-3.5 py-2`;
  const btnDanger = `${btnBase} ${btnText} text-white bg-red-600 hover:bg-red-700 focus-visible:ring-red-600 px-3.5 py-2`;
  const btnOutline = `${btnBase} text-sm px-3.5 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus-visible:ring-blue-500`;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
        sortBy: String(sortField),
        sortOrder: String(sortOrder),
      });
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal mengambil data user');
      }
      const data = await res.json();

      // Expecting shape: { users: UserData[], stats: Stats, pagination: { totalPages, total } }
      setUsers(Array.isArray(data.users) ? data.users : []);
      setStats(
        data.stats || {
          totalPending: 0,
          totalVerified: 0,
          totalRejected: 0,
          totalUsers: 0,
          todayRegistrations: 0,
        }
      );
      setTotalPages(Number(data.pagination?.totalPages || 1));
      setTotalUsersCount(Number(data.pagination?.total || 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
      console.error('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, statusFilter, sortField, sortOrder, limit]);

  useEffect(() => {
    // Only fetch users if session is available
    if (session?.user) {
      fetchUsers();
    }
  }, [fetchUsers, refreshTrigger, session?.user]);

  // Reset ke halaman 1 saat parameter list berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, sortField, sortOrder]);

  // Kembalikan fokus ke search input setelah selesai loading
  useEffect(() => {
    if (!loading && isInputFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading, isInputFocused]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortOrder('asc');
      }
    },
    [sortField, sortOrder]
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsInputFocused(true);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
    setSortField('created_at');
    setSortOrder('desc');
  }, []);

  const getSortIcon = useCallback(
    (field: SortField) => {
      if (sortField !== field) return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
      return sortOrder === 'asc' ? (
        <ChevronUpIcon className="w-4 h-4 text-blue-500" />
      ) : (
        <ChevronDownIcon className="w-4 h-4 text-blue-500" />
      );
    },
    [sortField, sortOrder]
  );

  const formatDate = useCallback((dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  }, []);

  const getRoleBadge = useCallback((role: UserData['role'] | string) => {
    const r = String(role); // toleransi enum/string
    const colors: Record<string, string> = {
      VENDOR: 'bg-green-100 text-green-800',
      VERIFIER: 'bg-blue-100 text-blue-800',
      REVIEWER: 'bg-yellow-100 text-yellow-800',
      APPROVER: 'bg-orange-100 text-orange-800',
      ADMIN: 'bg-purple-100 text-purple-800',
      SUPER_ADMIN: 'bg-red-100 text-red-800',
      VISITOR: 'bg-cyan-100 text-cyan-800',
    };
    const roleLabels: Record<string, string> = {
      VENDOR: 'Vendor',
      VERIFIER: 'Verifier',
      REVIEWER: 'Reviewer',
      APPROVER: 'Approver',
      ADMIN: 'Admin',
      SUPER_ADMIN: 'Super Admin',
      VISITOR: 'Visitor',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[r] || 'bg-gray-100 text-gray-800'}`}>{roleLabels[r] || r}</span>;
  }, []);

  const getVerificationStatus = useCallback((user: UserData) => {
    const s = user.verification_status || 'PENDING';
    switch (s) {
      case 'VERIFIED':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Terverifikasi</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Ditolak</span>;
      case 'PENDING':
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Menunggu Verifikasi</span>;
    }
  }, []);

  // === Modal wiring ===
  const openVerificationModal = (user: UserData) => {
    setSelectedUser(user);
    setShowVerificationModal(true);
  };
  const closeVerificationModal = () => {
    setShowVerificationModal(false);
    setSelectedUser(null);
  };
  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };
  const closeEditModal = () => {
    setShowEditUserModal(false);
    setSelectedUser(null);
  };
  const openDeleteModal = (user: UserData) => {
    setSelectedUser(user);
    setShowDeleteUserModal(true);
  };
  const closeDeleteModal = () => {
    setShowDeleteUserModal(false);
    setSelectedUser(null);
  };

  // Saat modal update user (approve/reject), sinkronkan list & stats
  const handleUserUpdateFromModal = (updated: UserData) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));

    // Optimistic stats tweak:
    setStats((prev) => {
      const old = users.find((u) => u.id === updated.id);
      if (!old) return prev;
      const oldS = old.verification_status || 'PENDING';
      const newS = updated.verification_status || 'PENDING';
      if (oldS === newS) return prev;

      let { totalPending, totalVerified, totalRejected } = prev;
      const { totalUsers, todayRegistrations } = prev;
      if (oldS === 'PENDING') totalPending = Math.max(0, totalPending - 1);
      if (oldS === 'VERIFIED') totalVerified = Math.max(0, totalVerified - 1);
      if (oldS === 'REJECTED') totalRejected = Math.max(0, totalRejected - 1);

      if (newS === 'PENDING') totalPending += 1;
      if (newS === 'VERIFIED') totalVerified += 1;
      if (newS === 'REJECTED') totalRejected += 1;

      return { totalPending, totalVerified, totalRejected, totalUsers, todayRegistrations };
    });

    // Refetch agar 100% konsisten
    fetchUsers().catch(() => {});
    showSuccess('Berhasil', 'Status verifikasi diperbarui');
  };

  // Handle edit user update
  const handleUserEdit = (updated: UserData) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
    // Refetch to ensure consistency
    fetchUsers().catch(() => {});
    // Note: Toast already shown by EditUserModal
  };

  // Handle user delete
  const handleUserDelete = (deletedUserId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== deletedUserId));
    // Update stats
    setStats((prev) => ({
      ...prev,
      totalUsers: Math.max(0, prev.totalUsers - 1)
    }));
    // Refetch to ensure consistency
    fetchUsers().catch(() => {});
    // Note: Toast already shown by DeleteUserModal (if uncommented)
  };

  // Handle user create
  const handleUserCreate = (newUser: UserData) => {
    setUsers((prev) => [newUser, ...prev]);
    // Update stats
    setStats((prev) => ({
      ...prev,
      totalUsers: prev.totalUsers + 1,
      totalVerified: prev.totalVerified + 1, // Admin-created users are auto-verified
    }));
    // Refetch to ensure consistency
    fetchUsers().catch(() => {});
    // Note: Toast already shown by CreateUserModal
  };

  const paginationInfo = useMemo(
    () => ({
      currentPage,
      totalPages,
      total: totalUsersCount,
      startItem: (currentPage - 1) * limit + 1,
      endItem: Math.min(currentPage * limit, totalUsersCount),
    }),
    [currentPage, totalPages, totalUsersCount, limit]
  );

  // ==== Render table content ====
  const tableContent = useMemo(() => {
    if (error) {
      return (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{error}</div>
            <button onClick={fetchUsers} className={`${btnDanger} mt-2`}>
              Coba Lagi
            </button>
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
                  onClick={() => handleSort('officer_name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Nama Petugas</span>
                    {getSortIcon('officer_name')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('email')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Email</span>
                    {getSortIcon('email')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('role')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Role</span>
                    {getSortIcon('role')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor/Kontak</th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Tgl Dibuat</span>
                    {getSortIcon('created_at')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {users.filter(user => user.vendor_name !== "[DELETED VENDOR]").map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.officer_name}</div>
                    {user.address && <div className="text-sm text-gray-500 truncate max-w-xs">{user.address}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.vendor_name ?? '-'}</div>
                    {user.phone_number && <div className="text-sm text-gray-500">{user.phone_number}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(user.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getVerificationStatus(user)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* Lihat: tersedia untuk semua role */}
                      <button
                        onClick={() => openVerificationModal(user)}
                        className={btnLink}
                        title="Lihat Detail"
                      >
                        Lihat
                      </button>

                      {/* Edit & Hapus: hanya untuk SUPER_ADMIN */}
                      {isSuperAdmin && (
                        <>
                          <button
                            onClick={() => openEditModal(user)}
                            className={btnNeutral}
                            title="Edit User"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => openDeleteModal(user)}
                            className={btnDanger}
                            title="Hapus User"
                          >
                            Hapus
                          </button>
                        </>
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}
      </div>
    );
  }, [users, loading, error, handleSort, getSortIcon, formatDate, getRoleBadge, getVerificationStatus, isSuperAdmin]);

  // Loading state for session
  if (sessionStatus === 'loading') {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (sessionStatus === 'unauthenticated' || !session?.user) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">Anda harus login untuk mengakses halaman ini</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && users.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistik Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <h3 className="text-sm font-medium text-gray-500">Ditolak</h3>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.totalRejected}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <XCircleIcon className="w-6 h-6 text-red-600" />
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

      {/* Search & Filter */}
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
            const v = e.target.value as 'all' | 'pending' | 'verified' | 'rejected';
            setStatusFilter(v);
            setCurrentPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Belum Verifikasi</option>
          <option value="verified">Sudah Verifikasi</option>
          <option value="rejected">Ditolak</option>
        </select>

        {/* Tombol reset filter */}
        <button onClick={resetFilters} className={btnOutline}>
          Reset Filter
        </button>

        {/* Tombol tambah user baru — biru dan hanya untuk SUPER_ADMIN */}
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <UserPlusIcon className="w-4 h-4" />
            Tambah User
          </button>
      </div>

      {/* Tabel */}
      <div className="relative">{tableContent}</div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Menampilkan {paginationInfo.startItem} - {paginationInfo.endItem} dari {paginationInfo.total} user
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>

            <div className="flex items-center space-x-1">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 border text-sm font-medium rounded-md ${
                        currentPage === page
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="text-gray-500">
                      …
                    </span>
                  );
                }
                return null;
              })}
            </div>

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

      {/* Modal verifikasi */}
      <ReviewerUserVerificationModal
        user={selectedUser}
        isOpen={showVerificationModal}
        onClose={closeVerificationModal}
        onUserUpdate={handleUserUpdateFromModal}
      />

      {/* Modal Edit User */}
      <EditUserModal
        user={selectedUser}
        isOpen={showEditUserModal}
        onClose={closeEditModal}
        onUserUpdate={handleUserEdit}
      />

      {/* Modal Delete User */}
      <DeleteUserModal
        user={selectedUser}
        isOpen={showDeleteUserModal}
        onClose={closeDeleteModal}
        onUserDelete={handleUserDelete}
      />

      {/* Modal Create User */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onUserCreate={handleUserCreate}
      />
    </div>
  );
}
