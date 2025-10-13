/**
 * Common types and interfaces used across the application
 */

// Statistics interface for dashboard
export interface Statistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// Pagination interface
export interface Pagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}

// API Response wrappers
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiListResponse<T = any> extends ApiResponse<T[]> {
  pagination?: Pagination;
}

// User reference for relations
export interface UserReference {
  id: string;
  officer_name: string;
  email: string;
  vendor_name?: string | null;
}

// Route params interface for API endpoints
export interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// File upload related types
export interface FileValidationOptions {
  maxSizeMB?: number;
  allowedTypes?: readonly string[];
  allowedExtensions?: readonly string[];
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  size?: number;
  type?: string;
  extension?: string;
}

// Search and filter options
export interface SearchFilters {
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export type SortOrder = 'asc' | 'desc';