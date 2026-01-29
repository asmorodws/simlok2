'use client';

import type { ReactNode } from 'react';
import {
  ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';

export type SortOrder = 'asc' | 'desc';

export interface Column<T extends object> {
  key: string;
  header: ReactNode | string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  className?: string;
  minWidth?: number | string;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export interface PaginationProps {
  page: number;
  pages: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface ReusableTableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  sortBy?: string;
  sortOrder?: SortOrder;
  onSortChange?: (field: string, nextOrder: SortOrder) => void;
  empty?: EmptyStateProps;
  pagination?: PaginationProps;
  search?: SearchProps;
  loading?: boolean;
  error?: string;
  className?: string;
  rowKey?: (row: T, index: number) => string;
}

export default function ReusableTable<T extends object>({
  columns,
  data,
  sortBy,
  sortOrder = 'desc',
  onSortChange,
  empty,
  pagination,
  search,
  loading = false,
  error,
  className,
  rowKey,
}: ReusableTableProps<T>) {
  const getSortIcon = (field: string) => {
    if (!onSortChange) return null;
    if (sortBy !== field) return <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />;
    return sortOrder === 'asc'
      ? <ChevronUpIcon className="h-4 w-4 text-gray-600" />
      : <ChevronDownIcon className="h-4 w-4 text-gray-600" />;
  };

  const handleSort = (col: Column<T>) => {
    if (!onSortChange || !col.sortable) return;
    const nextOrder: SortOrder = sortBy === col.key ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'desc';
    onSortChange(col.key, nextOrder);
  };

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      {/* Search Bar */}
      {search && (
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder || 'Cari...'}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {data.length === 0 ? (
        <div className="text-center py-16">
          {empty?.icon}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {empty?.title ?? 'Tidak ada data'}
          </h3>
          {empty?.description && (
            <p className="text-gray-500 max-w-md mx-auto">{empty.description}</p>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={[
                        'px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500',
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                        col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : '',
                        col.className ?? ''
                      ].join(' ')}
                      style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                      onClick={() => handleSort(col)}
                    >
                      <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'} gap-1`}>
                        <span>{col.header}</span>
                        {col.sortable && getSortIcon(col.key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, idx) => (
                  <tr key={rowKey ? rowKey(row, idx) : `row-${idx}`} className="hover:bg-gray-50 transition-colors">
                    {columns.map((col) => (
                      <td
                        key={`${col.key}-${rowKey ? rowKey(row, idx) : idx}`}
                        className={[
                          'px-4 py-3 align-top',
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                          col.className ?? ''
                        ].join(' ')}
                        style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Menampilkan {((pagination.page - 1) * pagination.limit) + 1} sampai{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} dari{' '}
                  {pagination.total} data
                </div>
                <div className="flex space-x-1">
                  <Button
                    onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
                    disabled={pagination.page === 1}
                    variant="outline"
                    size="sm"
                  >
                    Sebelumnya
                  </Button>
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter(page => {
                      const d = Math.abs(page - pagination.page);
                      return d === 0 || d === 1 || page === 1 || page === pagination.pages;
                    })
                    .map((page, index, array) => (
                      <span key={page} className="inline-flex">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-3 py-1 text-gray-500">...</span>
                        )}
                        <Button
                          onClick={() => pagination.onPageChange(page)}
                          variant={pagination.page === page ? 'primary' : 'outline'}
                          size="sm"
                          className={pagination.page === page ? 'bg-blue-600 text-white' : ''}
                        >
                          {page}
                        </Button>
                      </span>
                    ))}
                  <Button
                    onClick={() => pagination.onPageChange(Math.min(pagination.pages, pagination.page + 1))}
                    disabled={pagination.page === pagination.pages}
                    variant="outline"
                    size="sm"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>
      )}
    </div>
  );
}
