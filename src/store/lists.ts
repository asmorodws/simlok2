import { create } from 'zustand';

export interface SubmissionListItem {
  id: string;
  vendor_name: string;
  officer_name: string;
  job_description: string;
  approval_status: string;
  created_at: string;
  work_location: string;
}

export interface VendorListItem {
  id: string;
  vendor_name: string;
  officer_name: string;
  email: string;
  created_at: string;
  verified_at: string | null;
}

interface ListsState {
  submissions: SubmissionListItem[];
  vendors: VendorListItem[];
  submissionsLoading: boolean;
  vendorsLoading: boolean;
}

interface ListsActions {
  setSubmissions: (submissions: SubmissionListItem[]) => void;
  addSubmission: (submission: SubmissionListItem) => void;
  updateSubmission: (id: string, updates: Partial<SubmissionListItem>) => void;
  setVendors: (vendors: VendorListItem[]) => void;
  addVendor: (vendor: VendorListItem) => void;
  updateVendor: (id: string, updates: Partial<VendorListItem>) => void;
  setSubmissionsLoading: (loading: boolean) => void;
  setVendorsLoading: (loading: boolean) => void;
  reset: () => void;
}

export type ListsStore = ListsState & ListsActions;

const initialState: ListsState = {
  submissions: [],
  vendors: [],
  submissionsLoading: false,
  vendorsLoading: false,
};

export const useListsStore = create<ListsStore>((set) => ({
  ...initialState,

  setSubmissions: (submissions) => set({ submissions }),

  addSubmission: (submission) => set((state) => ({
    submissions: [submission, ...state.submissions],
  })),

  updateSubmission: (id, updates) => set((state) => ({
    submissions: state.submissions.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ),
  })),

  setVendors: (vendors) => set({ vendors }),

  addVendor: (vendor) => set((state) => ({
    vendors: [vendor, ...state.vendors],
  })),

  updateVendor: (id, updates) => set((state) => ({
    vendors: state.vendors.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ),
  })),

  setSubmissionsLoading: (loading) => set({ submissionsLoading: loading }),

  setVendorsLoading: (loading) => set({ vendorsLoading: loading }),

  reset: () => set(initialState),
}));
