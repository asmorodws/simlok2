'use client';

import type { ReactNode } from 'react';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/Badge';

export type SortOrder = 'asc' | 'desc';

export interface Column<T extends Record<string, unknown>> {
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

export interface SubmissionRow extends Record<string, unknown> {
  id: string;
  job_description: string;
  officer_name: string;
  work_location: string;
  work_hours: string;
  approval_status: string;
  review_status: string;
  simlok_number?: string;
  created_at: string;
}

interface ReusableTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  sortBy?: string;
  sortOrder?: SortOrder;
  onSortChange?: (field: string, nextOrder: SortOrder) => void;
  empty?: EmptyStateProps;
  pagination?: PaginationProps;
  className?: string;
  rowKey?: (row: T, index: number) => string;
}

function ReusableTable<T extends Record<string, unknown>>({
  columns,
  data,
  sortBy,
  sortOrder = 'desc',
  onSortChange,
  empty,
  pagination,
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
    const nextOrder: SortOrder = 
      sortBy === col.key ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'desc';
    onSortChange(col.key, nextOrder);
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${className ?? ''}`}>
      {data.length === 0 ? (
        <div className="text-center py-16">
          {empty?.icon}
          <h3 className="text-lg font-medium text-gray-900 mb-2">{empty?.title ?? 'Tidak ada data'}</h3>
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
                  <tr 
                    key={rowKey ? rowKey(row, idx) : `row-${idx}`} 
                    className="hover:bg-gray-50 transition-colors"
                  >
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
  );
}

interface SubmissionsTableProps {
  submissions: SubmissionRow[];
  loading: boolean;
  onView: (submission: SubmissionRow) => void;
  onDelete?: (id: string) => void;
  formatDate?: (date: string) => string;
}

export function SubmissionsTable({
  submissions,
  loading,
  onView,
  onDelete,
  formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID')
}: SubmissionsTableProps) {
  const getVendorStatusBadge = (reviewStatus: string, approvalStatus: string) => {
    if (approvalStatus === 'APPROVED') {
      return <Badge variant="success">Disetujui</Badge>;
    }
    if (approvalStatus === 'REJECTED') {
      return <Badge variant="destructive">Ditolak</Badge>;
    }
    if (reviewStatus === 'PENDING_REVIEW') {
      return <Badge variant="warning">Menunggu Review</Badge>;
    }
    if (reviewStatus === 'MEETS_REQUIREMENTS') {
      return <Badge variant="warning">Menunggu Persetujuan</Badge>;
    }
    if (reviewStatus === 'NEEDS_REVISION') {
      return <Badge variant="warning">Perlu Revisi</Badge>;
    }
    return <Badge variant="default">Sedang Diproses</Badge>;
  };

  const columns: Column<SubmissionRow>[] = [
    {
  key: 'job_description',
  header: 'Deskripsi Pekerjaan',
  cell: (row) => (
    <span className="block max-w-[300px] whitespace-normal break-words">
      {row.job_description}
    </span>
  ),
  sortable: true,
  align: 'left',
  minWidth: 300,
  className: 'max-w-[300px] whitespace-normal break-words',
},
{
  key: 'work_location',
  header: 'Lokasi Kerja',
  cell: (row) => (
    <span className="block max-w-[300px] whitespace-normal break-words">
      {row.work_location}
    </span>
  ),
  sortable: true,
  align: 'left',
  minWidth: 300,
  className: 'max-w-[300px] whitespace-normal break-words',
},

    {
      key: 'approval_status',
      header: 'Status',
      cell: (row) => {
        return getVendorStatusBadge(
          (row.review_status as string) || '',
          (row.approval_status as string) || ''
        );
      },
      sortable: true,
    },
    {
      key: 'created_at',
      header: 'Tanggal Dibuat',
      cell: (row) => (
        <span className="whitespace-nowrap">
          {formatDate(row.created_at)}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Aksi',
      cell: (row) => (
        <div className="flex gap-2 whitespace-nowrap">
          <Button size="sm" variant="info" onClick={() => onView(row)}>
            Lihat
          </Button>
          {onDelete && (row.approval_status === "PENDING_APPROVAL" && row.review_status === "PENDING_REVIEW") && (
            <Button size="sm" variant="destructive" onClick={() => onDelete(row.id)}>
              Hapus
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ReusableTable
      columns={columns}
      data={submissions}
      empty={{
        title: 'Tidak ada pengajuan',
      }}
    />
  );
}
