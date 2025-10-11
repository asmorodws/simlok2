import { create } from 'zustand';

interface AdminStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalUsers: number;
  pendingUsers: number;
  totalVendors: number;
  totalVerifiers: number;
  pendingVerificationVendors: number;
  pendingVerificationSubmissions: number;
}

interface VendorStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  draftSubmissions: number;
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
}

interface StatsStore {
  adminStats: AdminStats | null;
  vendorStats: VendorStats | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setAdminStats: (stats: AdminStats) => void;
  setVendorStats: (stats: VendorStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchAdminStats: () => Promise<void>;
  fetchVendorStats: () => Promise<void>;
}

export const useStatsStore = create<StatsStore>((set) => ({
  adminStats: null,
  vendorStats: null,
  loading: false,
  error: null,

  setAdminStats: (stats) => set({ adminStats: stats }),
  setVendorStats: (stats) => set({ vendorStats: stats }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchAdminStats: async () => {
    try {
      set({ loading: true, error: null });
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
      }
      const stats = await response.json();
      set({ adminStats: stats, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
        loading: false 
      });
    }
  },

  fetchVendorStats: async () => {
    try {
      set({ loading: true, error: null });
      const response = await fetch('/api/vendor/dashboard/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch vendor stats');
      }
      const stats = await response.json();
      set({ vendorStats: stats, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
        loading: false 
      });
    }
  },
}));
