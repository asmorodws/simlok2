import { create } from 'zustand';

interface Submission {
  id: string;
  job_description: string;
  work_location: string;
  approval_status: string;
  review_status?: string;
  review_note?: string | null;
  final_note?: string | null;
  final_status?: string;
  reviewed_at?: string | null;
  approved_at?: string | null;
  simlok_number?: string | null;
  simlok_date?: string | null;
  created_at: string;
  vendor_name: string;
  officer_name: string;
  based_on: string;
  working_hours: string;
  implementation?: string | null;
  work_facilities: string;
  worker_names: string;
  content?: string | null;
  notes?: string | null;
  simja_number?: string | null;
  simja_date?: string | null;
  sika_number?: string | null;
  sika_date?: string | null;
  other_notes?: string | null;
  sika_document_upload?: string | null;
  simja_document_upload?: string | null;
  qrcode?: string | null;
  signer_position?: string | null;
  signer_name?: string | null;
  user: {
    id: string;
    officer_name: string;
    email: string;
    vendor_name: string;
  };
  approved_by_user?: {
    id: string;
    officer_name: string;
    email: string;
  } | null;
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
  allSubmissionsStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  } | null;
  filteredTotal: number;
  
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
  setAllSubmissionsStats: (stats: any) => void;
  
  // Fetch functions
  fetchSubmissions: (params?: any) => Promise<void>;
  fetchVendorSubmissions: (params?: any) => Promise<void>;
  fetchVendorStats: () => Promise<void>;
  fetchAdminStats: () => Promise<void>;
  fetchLatestSubmissions: () => Promise<void>;
  
    // CRUD operations
  updateSubmissionStatus: (id: string, status: string) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
  
  // Force refresh
  forceRefresh: () => Promise<void>;
};


export const useSubmissionStore = create<SubmissionStore>((set, get) => ({
  submissions: [],
  loading: false,
  error: null,
  statistics: null,
  allSubmissionsStats: null,
  filteredTotal: 0,
  
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
  setAllSubmissionsStats: (allSubmissionsStats) => set({ allSubmissionsStats }),
  
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
      console.log('Admin submissions API response:', data); // Debug log
      set({ 
        submissions: data.submissions || [],
        totalPages: data.pagination?.pages || 1,
        filteredTotal: data.pagination?.total || 0,
        loading: false 
      });
    } catch (error) {
      console.error('Error fetching submissions:', error); // Debug log
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch submissions',
        loading: false 
      });
    }
  },

  fetchAdminStats: async () => {
    try {
      // Fetch statistics without any filters
      const response = await fetch('/api/admin/submissions/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
      }
      
      const data = await response.json();
      set({ 
        allSubmissionsStats: data.statistics || null
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
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
      
      // Add cache busting timestamp
      searchParams.append('_t', Date.now().toString());
      
      const url = `/api/vendor/submissions?${searchParams}`;
      console.log('Store: Fetching vendor submissions from:', url);
      console.log('Store: Request params:', params);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Include cookies for session
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        console.error('Store: API response not ok:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Store: Error response data:', errorData);
        
        if (response.status === 401) {
          // Session expired or not authenticated
          console.error('Store: Authentication error - redirecting to login');
          window.location.href = '/login';
          return;
        }
        
        throw new Error(`Failed to fetch vendor submissions: ${response.status} - ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Store: API response data:', data);
      console.log('Store: Submissions count:', data.submissions?.length || 0);
      console.log('Store: Sample submission data:', data.submissions?.[0]);
      console.log('Store: Pagination:', data.pagination);
      
      set({ 
        submissions: data.submissions || [],
        totalPages: data.pagination?.pages || 1,
        filteredTotal: data.pagination?.total || 0,
        loading: false 
      });
      
      console.log('Store: State updated successfully');
    } catch (error) {
      console.error('Store: Error in fetchVendorSubmissions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch submissions',
        loading: false 
      });
    }
  },

  fetchVendorStats: async () => {
    try {
      // Fetch statistics without any filters
      const response = await fetch('/api/vendor/submissions/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch vendor stats');
      }
      
      const data = await response.json();
      set({ 
        allSubmissionsStats: data.statistics || null
      });
    } catch (error) {
      console.error('Error fetching vendor stats:', error);
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
  
  forceRefresh: async () => {
    const { searchTerm, sortField, sortOrder, currentPage } = get();
    const params = {
      page: currentPage,
      limit: 10,
      sortBy: sortField,
      sortOrder,
      ...(searchTerm?.trim() && { search: searchTerm.trim() })
    };
    
    console.log('Store: Force refreshing with params:', params);
    await get().fetchVendorSubmissions(params);
  }
}));
