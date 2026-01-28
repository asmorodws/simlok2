'use client';

import { XMarkIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';

/**
 * SHARED: Empty State Component for both Approver & Reviewer
 * Shows when no submissions available or filters return empty results
 */
export function EmptyState({
  hasFilters,
  onClearFilters,
  title,
  description,
  children,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-12 text-center">
        <div className="mx-auto h-24 w-24 text-gray-300 mb-6">
          <DocumentCheckIcon className="h-full w-full" />
        </div>

        {hasFilters ? (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Tidak ada data yang sesuai dengan filter
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Tidak ditemukan pengajuan yang sesuai dengan kriteria pencarian atau filter yang Anda
              terapkan.
            </p>
            <Button onClick={onClearFilters} variant="outline" className="mx-auto">
              <XMarkIcon className="h-4 w-4 mr-2" />
              Hapus Filter
            </Button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">{description}</p>
            {children}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * SHARED: Pagination metadata type
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * SHARED: Submissions response structure
 */
export interface SubmissionsResponse<T> {
  submissions: T[];
  pagination: PaginationMeta;
}

/**
 * SHARED: Filter state management
 */
export interface FilterState {
  searchTerm: string;
  reviewStatusFilter: string;
  finalStatusFilter: string;
  currentPage: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * SHARED: Build URL params from filters
 */
export function buildSubmissionsParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams({
    page: filters.currentPage.toString(),
    limit: '10',
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  if (filters.searchTerm) params.append('search', filters.searchTerm);
  if (filters.reviewStatusFilter) params.append('reviewStatus', filters.reviewStatusFilter);
  if (filters.finalStatusFilter) params.append('finalStatus', filters.finalStatusFilter);

  return params;
}
