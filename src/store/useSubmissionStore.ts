import { create } from 'zustand';

interface Submission {
  id: string;
  title: string;
  status: string;
  vendor_id: string;
  created_at: string;
  updated_at: string;
  vendor?: {
    company_name: string;
  };
  [key: string]: any;
}

interface SubmissionStore {
  submissions: Submission[];
  loading: boolean;
  error: string | null;
  statistics: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  } | null;
  
  // Search and filters
  searchTerm: string;
  sortField: string;
  sortOrder: string;
  currentPage: number;
  totalPages: number;
  
  // Actions
  setSubmissions: (submissions: Submission[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchTerm: (term: string) => void;
  setSortField: (field: string) => void;
  setSortOrder: (order: string) => void;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  setTotalPages: (pages: number) => void;
  setStatistics: (stats: any) => void;
  
  // Fetch functions
  fetchSubmissions: (params?: any) => Promise<void>;
  fetchVendorSubmissions: (params?: any) => Promise<void>;
  fetchLatestSubmissions: () => Promise<void>;
  
  // CRUD operations
  updateSubmissionStatus: (id: string, status: string) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
}

export const useSubmissionStore = create<SubmissionStore>((set, get) => ({
  submissions: [],
  loading: false,
  error: null,
  statistics: null,
  
  searchTerm: '',
  sortField: 'created_at',
  sortOrder: 'desc',
  currentPage: 1,
  totalPages: 1,
  
  setSubmissions: (submissions) => set({ submissions }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setSortField: (sortField) => set({ sortField }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setCurrentPage: (currentPage) => {
    if (typeof currentPage === 'function') {
      set((state) => ({ currentPage: currentPage(state.currentPage) }));
    } else {
      set({ currentPage });
    }
  },
  setTotalPages: (totalPages) => set({ totalPages }),
  setStatistics: (statistics) => set({ statistics }),
  
  fetchSubmissions: async (params = {}) => {
    try {
      set({ loading: true, error: null });
      
      const searchParams = new URLSearchParams({
        page: params.page?.toString() || '1',
        limit: params.limit?.toString() || '10',
        sortBy: params.sortBy || 'created_at',
        sortOrder: params.sortOrder || 'desc',
        ...(params.search && { search: params.search }),
        ...(params.status && { status: params.status }),
      });
      
      const response = await fetch(`/api/admin/submissions?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }
      
      const data = await response.json();
      set({ 
        submissions: data.submissions || [],
        totalPages: data.pagination?.pages || 1,
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch submissions',
        loading: false 
      });
    }
  },
  
  fetchVendorSubmissions: async (params = {}) => {
    try {
      set({ loading: true, error: null });
      
      const searchParams = new URLSearchParams({
        page: params.page?.toString() || '1',
        limit: params.limit?.toString() || '10',
        sortBy: params.sortBy || 'created_at',
        sortOrder: params.sortOrder || 'desc',
        ...(params.search && { search: params.search }),
        ...(params.status && { status: params.status }),
      });
      
      const response = await fetch(`/api/vendor/submissions?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vendor submissions');
      }
      
      const data = await response.json();
      set({ 
        submissions: data.submissions || [],
        totalPages: data.pagination?.pages || 1,
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch submissions',
        loading: false 
      });
    }
  },
  
  fetchLatestSubmissions: async () => {
    try {
      set({ loading: true, error: null });
      
      const response = await fetch('/api/admin/dashboard/recent-submissions');
      if (!response.ok) {
        throw new Error('Failed to fetch latest submissions');
      }
      
      const data = await response.json();
      set({ 
        submissions: data.submissions || [],
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch submissions',
        loading: false 
      });
    }
  },
  
  updateSubmissionStatus: async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/submissions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update submission status');
      }
      
      // Update local state
      const submissions = get().submissions.map(sub => 
        sub.id === id ? { ...sub, status } : sub
      );
      set({ submissions });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update submission'
      });
      throw error;
    }
  },
  
  deleteSubmission: async (id: string) => {
    try {
      const response = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete submission');
      }
      
      // Remove from local state
      const submissions = get().submissions.filter(sub => sub.id !== id);
      set({ submissions });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete submission'
      });
      throw error;
    }
  },
}));
