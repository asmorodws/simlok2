'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Button from '@/components/ui/button/Button';
import ReviewerUserVerificationModal from '@/components/reviewer/ReviewerUserVerificationModal';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { UserData } from '@/types/user';
import UserTable from '@/components/users/UserTable';

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

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

export default function UserVerificationManagement({
  className = '',
  refreshTrigger = 0,
}: UserVerificationManagementProps) {
  // Note: showSuccess removed as toast is handled by ReviewerUserVerificationModal
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [limit] = useState(10);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');

  // Sorting (disambungkan ke UserTable.onSortChange)
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Modal
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Search focus retainer
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

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

      const res = await fetch(`/api/reviewer/users?${params.toString()}`);
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
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

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
    };
    const roleLabels: Record<string, string> = {
      VENDOR: 'Vendor',
      VERIFIER: 'Verifier',
      REVIEWER: 'Reviewer',
      APPROVER: 'Approver',
      ADMIN: 'Admin',
      SUPER_ADMIN: 'Super Admin',
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

  // Modal wiring
  const openModal = (user: UserData) => {
    setSelectedUser(user);
    setShowVerificationModal(true);
  };
  const closeModal = () => {
    setShowVerificationModal(false);
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
    // Note: Toast already shown by ReviewerUserVerificationModal
  };

  // Info paging (untuk teks ringkas bawah)
  const startItem = useMemo(() => (currentPage - 1) * limit + 1, [currentPage, limit]);
  const endItem = useMemo(() => Math.min(currentPage * limit, totalUsersCount), [currentPage, limit, totalUsersCount]);

  if (loading && users.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Skeleton */}
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

        <Button onClick={resetFilters} variant="outline" size="sm" className="px-3 py-2">
          Reset Filter
        </Button>
      </div>

      {/* Tabel: gunakan UserTable (adapter ReusableTable) */}
      <UserTable
        data={users}
        sortBy={sortField}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortField(field as SortField);
          setSortOrder(order as SortOrder);
        }}
        page={currentPage}
        pages={totalPages}
        limit={limit}
        total={totalUsersCount}
        onPageChange={(p) => setCurrentPage(p)}
        formatDate={formatDate}
        getRoleBadge={getRoleBadge}
        getVerificationStatus={getVerificationStatus}
        onOpenVerify={openModal}
        emptyTitle={error ? 'Gagal memuat data' : 'Tidak ada user yang ditemukan'}
        emptyDescription={error ? error : 'Coba ubah kata kunci atau filter.'}
      />

      {/* Info paging (opsional tampilan ringkas) */}
      {totalPages > 1 && (
        <div className="text-sm text-gray-700">
          Menampilkan {startItem} - {endItem} dari {totalUsersCount} user
        </div>
      )}

      {/* Modal verifikasi — komponenmu */}
      <ReviewerUserVerificationModal
        user={selectedUser}
        isOpen={showVerificationModal}
        onClose={closeModal}
        onUserUpdate={handleUserUpdateFromModal}
      />
    </div>
  );
}
