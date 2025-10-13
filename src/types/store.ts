/**
 * Store types and interfaces
 */

import { Submission } from './submission';
import { Statistics } from './common';

export interface SubmissionStore {
  submissions: Submission[];
  loading: boolean;
  error: string | null;
  statistics: Statistics | null;
  allSubmissionsStats: Statistics | null;
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
}

export interface NotificationStore {
  notifications: any[];
  unreadCount: number;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  
  // Actions
  setNotifications: (notifications: any[]) => void;
  setUnreadCount: (count: number) => void;
  setIsConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Operations
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}