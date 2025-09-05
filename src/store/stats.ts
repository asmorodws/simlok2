import { create } from 'zustand';

interface StatsState {
  // Admin stats
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalVendors: number;
  
  // Vendor stats
  vendorTotalSubmissions: number;
  vendorPendingSubmissions: number;
  vendorApprovedSubmissions: number;
  vendorRejectedSubmissions: number;
  
  loading: boolean;
}

interface StatsActions {
  updateStats: (changes: Record<string, number | string>) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export type StatsStore = StatsState & StatsActions;

const initialState: StatsState = {
  totalSubmissions: 0,
  pendingSubmissions: 0,
  approvedSubmissions: 0,
  rejectedSubmissions: 0,
  totalVendors: 0,
  vendorTotalSubmissions: 0,
  vendorPendingSubmissions: 0,
  vendorApprovedSubmissions: 0,
  vendorRejectedSubmissions: 0,
  loading: false,
};

export const useStatsStore = create<StatsStore>((set) => ({
  ...initialState,

  updateStats: (changes) => set((state) => {
    const newState = { ...state };
    
    Object.entries(changes).forEach(([key, value]) => {
      if (typeof value === 'number' && key in newState) {
        (newState as any)[key] = value;
      }
    });
    
    return newState;
  }),

  setLoading: (loading) => set({ loading }),

  reset: () => set(initialState),
}));
