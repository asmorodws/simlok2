/**
 * useSubmissionManagement - Reusable Hook untuk Submission Management Logic
 * 
 * Menggabungkan logic yang sama antara berbagai role submission pages
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'under_review';

export interface UseSubmissionManagementOptions {
  /** User role for filtering */
  role?: string;
  /** Initial page number */
  initialPage?: number;
  /** Items per page */
  limit?: number;
  /** Refresh trigger from parent */
  refreshTrigger?: number;
  /** API endpoint override */
  apiEndpoint?: string;
}

export interface UseSubmissionManagementReturn {
  // Data
  submissions: any[];
  stats: any;
  loading: boolean;
  error: string;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  setCurrentPage: (page: number) => void;
  
  // Search & Filter
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  statusFilter: StatusFilter;
  setStatusFilter: (status: StatusFilter) => void;
  
  // Sorting
  sortField: string;
  sortOrder: SortOrder;
  handleSort: (field: string) => void;
  
  // Actions
  fetchSubmissions: () => Promise<void>;
  refetchSubmissions: () => Promise<void>;
  
  // Session
  session: any;
  sessionStatus: string;
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
 * Hook untuk mengelola submission management state dan logic
 * Digunakan oleh RoleSubmissionsManagement untuk berbagai role
 */
export function useSubmissionManagement(
  options: UseSubmissionManagementOptions = {}
): UseSubmissionManagementReturn {
  const {
    role,
    initialPage = 1,
    limit = 10,
    refreshTrigger = 0,
    apiEndpoint = '/api/submissions',
  } = options;

  const { data: session, status: sessionStatus } = useSession();

  // State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Sorting
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
        sortBy: sortField,
        sortOrder: sortOrder,
      });
      
      if (role) params.append('role', role);
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`${apiEndpoint}?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal mengambil data submission');
      }
      
      const data = await res.json();

      setSubmissions(data.submissions || data.data || []);
      setStats(data.stats || {});
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: any) {
      console.error('Error fetching submissions:', err);
      setError(err.message || 'Terjadi kesalahan saat mengambil data submission');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, sortField, sortOrder, debouncedSearchTerm, statusFilter, role, apiEndpoint]);

  // Effect: Fetch when dependencies change
  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions, refreshTrigger]);

  // Effect: Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter]);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField, sortOrder]);

  const refetchSubmissions = useCallback(async () => {
    await fetchSubmissions();
  }, [fetchSubmissions]);

  return {
    // Data
    submissions,
    stats,
    loading,
    error,
    
    // Pagination
    currentPage,
    totalPages,
    totalCount,
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
    handleSort,
    
    // Actions
    fetchSubmissions,
    refetchSubmissions,
    
    // Session
    session,
    sessionStatus,
  };
}
