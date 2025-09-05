import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  company_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface UserStore {
  users: User[];
  pendingUsers: User[];
  loading: boolean;
  error: string | null;
  
  // Search and filters
  searchTerm: string;
  roleFilter: string;
  statusFilter: string;
  currentPage: number;
  totalPages: number;
  
  // Actions
  setUsers: (users: User[]) => void;
  setPendingUsers: (users: User[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchTerm: (term: string) => void;
  setRoleFilter: (role: string) => void;
  setStatusFilter: (status: string) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  
  // Fetch functions
  fetchUsers: (params?: any) => Promise<void>;
  fetchPendingUsers: () => Promise<void>;
  
  // CRUD operations
  approveUser: (id: string) => Promise<void>;
  rejectUser: (id: string) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  pendingUsers: [],
  loading: false,
  error: null,
  
  searchTerm: '',
  roleFilter: '',
  statusFilter: '',
  currentPage: 1,
  totalPages: 1,
  
  setUsers: (users) => set({ users }),
  setPendingUsers: (pendingUsers) => set({ pendingUsers }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setRoleFilter: (roleFilter) => set({ roleFilter }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setTotalPages: (totalPages) => set({ totalPages }),
  
  fetchUsers: async (params = {}) => {
    try {
      set({ loading: true, error: null });
      
      const searchParams = new URLSearchParams({
        page: params.page?.toString() || '1',
        limit: params.limit?.toString() || '10',
        ...(params.search && { search: params.search }),
        ...(params.role && { role: params.role }),
        ...(params.status && { status: params.status }),
      });
      
      const response = await fetch(`/api/admin/users?${searchParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      set({ 
        users: data.users || [],
        totalPages: data.pagination?.pages || 1,
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch users',
        loading: false 
      });
    }
  },
  
  fetchPendingUsers: async () => {
    try {
      set({ loading: true, error: null });
      
      const response = await fetch('/api/admin/users/pending');
      if (!response.ok) {
        throw new Error('Failed to fetch pending users');
      }
      
      const data = await response.json();
      set({ 
        pendingUsers: data.users || [],
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch pending users',
        loading: false 
      });
    }
  },
  
  approveUser: async (id: string) => {
    try {
      const response = await fetch(`/api/admin/users/${id}/approve`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve user');
      }
      
      // Remove from pending users
      const pendingUsers = get().pendingUsers.filter(user => user.id !== id);
      set({ pendingUsers });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to approve user'
      });
      throw error;
    }
  },
  
  rejectUser: async (id: string) => {
    try {
      const response = await fetch(`/api/admin/users/${id}/reject`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject user');
      }
      
      // Remove from pending users
      const pendingUsers = get().pendingUsers.filter(user => user.id !== id);
      set({ pendingUsers });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to reject user'
      });
      throw error;
    }
  },
  
  updateUser: async (id: string, data: Partial<User>) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      // Update local state
      const users = get().users.map(user => 
        user.id === id ? { ...user, ...data } : user
      );
      set({ users });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update user'
      });
      throw error;
    }
  },
  
  deleteUser: async (id: string) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      
      // Remove from local state
      const users = get().users.filter(user => user.id !== id);
      set({ users });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete user'
      });
      throw error;
    }
  },
}));
