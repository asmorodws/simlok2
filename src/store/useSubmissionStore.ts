import { create } from 'zustand';
import { SubmissionStore } from '@/types';

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
      
      const response = await fetch(`/api/submissions?${searchParams}`);
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
      const response = await fetch('/api/submissions/stats');
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
      
      const url = `/api/submissions?${searchParams}`;
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
      const response = await fetch('/api/vendor/dashboard/stats');
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
      
      const response = await fetch('/api/dashboard/recent-submissions');
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
