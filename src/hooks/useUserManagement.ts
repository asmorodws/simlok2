/**
 * useUserManagement - Reusable Hook untuk User Management Logic
 * 
 * Menggabungkan logic yang sama antara AdminUserVerificationManagement
 * dan ReviewerUserVerificationManagement menjadi satu hook
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { UserData, UserManagementStats } from '@/types';

type SortField = keyof UserData;
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected';

export interface UseUserManagementOptions {
  /** Initial page number */
  initialPage?: number;
  /** Items per page */
  limit?: number;
  /** Refresh trigger from parent */
  refreshTrigger?: number;
  /** Additional filters */
  additionalFilters?: Record<string, string>;
}

export interface UseUserManagementReturn {
  // Data
  users: UserData[];
  stats: UserManagementStats;
  loading: boolean;
  error: string;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalUsersCount: number;
  setCurrentPage: (page: number) => void;
  
  // Search & Filter
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  statusFilter: StatusFilter;
  setStatusFilter: (status: StatusFilter) => void;
  
  // Sorting
  sortField: SortField;
  sortOrder: SortOrder;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  handleSort: (field: SortField) => void;
  
  // Actions
  fetchUsers: () => Promise<void>;
  refetchUsers: () => Promise<void>;
  
  // Session
  session: any;
  sessionStatus: string;
  currentUserId: string | undefined;
  isSuperAdmin: boolean;
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

/**
 * Hook untuk mengelola user management state dan logic
 * 
 * @example
 * ```tsx
 * const {
 *   users,
 *   loading,
 *   searchTerm,
 *   setSearchTerm,
 *   handleSort,
 *   currentPage,
 *   totalPages,
 *   setCurrentPage,
 * } = useUserManagement({ limit: 10 });
 * ```
 */
export function useUserManagement(options: UseUserManagementOptions = {}): UseUserManagementReturn {
  const {
    initialPage = 1,
    limit = 10,
    refreshTrigger = 0,
    additionalFilters = {},
  } = options;

  const { data: session, status: sessionStatus } = useSession();
  const currentUserId = session?.user?.id;
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  // State
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<UserManagementStats>({
    totalPending: 0,
    totalVerified: 0,
    totalRejected: 0,
    totalUsers: 0,
    todayRegistrations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
        sortBy: String(sortField),
        sortOrder: String(sortOrder),
        ...additionalFilters,
      });
      
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal mengambil data user');
      }
      
      const data = await res.json();

      setUsers(data.users || []);
      setStats(data.stats || {
        totalPending: 0,
        totalVerified: 0,
        totalRejected: 0,
        totalUsers: 0,
        todayRegistrations: 0,
      });
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalUsersCount(data.pagination?.total || 0);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Terjadi kesalahan saat mengambil data user');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, sortField, sortOrder, debouncedSearchTerm, statusFilter, additionalFilters]);

  // Effect: Fetch users when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  // Effect: Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField, sortOrder]);

  const refetchUsers = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  return {
    // Data
    users,
    stats,
    loading,
    error,
    
    // Pagination
    currentPage,
    totalPages,
    totalUsersCount,
    setCurrentPage,
    
    // Search & Filter
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    
    // Sorting
    sortField,
    sortOrder,
    setSortField,
    setSortOrder,
    handleSort,
    
    // Actions
    fetchUsers,
    refetchUsers,
    
    // Session
    session,
    sessionStatus,
    currentUserId,
    isSuperAdmin,
  };
}
