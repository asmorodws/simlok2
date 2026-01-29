'use client';

import { useMemo } from 'react';
import ReusableTable, {
  type Column,
  type SortOrder,
} from '@/components/ui/table/Table';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import TableActionButton from '@/components/ui/table/TableActionButton';
import {
  ReviewStatusBadge,
  ApprovalStatusBadge,
  formatSubmissionDate,
  type BaseSubmission,
} from '@/components/features/submission/SubmissionTableShared';

/**
 * UNIFIED: Submission Table Component for All Roles
 * Replaces ApproverTable, ReviewerTable, VerifierTable, VendorTable
 * 
 * Role-specific behavior controlled via props:
 * - showScanColumn: Display scan count (Reviewer, Verifier)
 * - actionLabel: Custom action button label
 * - pendingCondition: Function to determine if submission is pending
 */

export interface UnifiedSubmissionTableProps<T extends BaseSubmission = BaseSubmission> {
  data: T[];
  loading?: boolean;

  // Sorting
  sortBy?: keyof T | string;
  sortOrder?: SortOrder;
  onSortChange?: (field: keyof T | string, order: SortOrder) => void;

  // Pagination
  page?: number;
  pages?: number;
  limit?: number;
  total?: number;
  onPageChange?: (p: number) => void;

  // Actions
  onOpenDetail: (submissionId: string) => void;

  // Role-specific customization
  showScanColumn?: boolean; // For Reviewer, Verifier
  actionLabelPending?: string; // Label when pending (default: "Review")
  actionLabelCompleted?: string; // Label when completed (default: "Lihat")
  pendingCondition?: (submission: T) => boolean; // Custom pending logic
  
  // Empty state
  emptyTitle?: string;
  emptyDescription?: string;
  
  // Skeleton component
  SkeletonComponent?: React.ComponentType;
}

export default function UnifiedSubmissionTable<T extends BaseSubmission = BaseSubmission>({
  data,
  loading = false,
  sortBy,
  sortOrder = 'desc',
  onSortChange,
  page = 1,
  pages = 1,
  limit = 10,
  total = 0,
  onPageChange,
  onOpenDetail,
  showScanColumn = false,
  actionLabelPending = 'Review',
  actionLabelCompleted = 'Lihat',
  pendingCondition = (s) => s.approval_status === 'PENDING_APPROVAL',
  emptyTitle = 'Tidak ada pengajuan',
  emptyDescription = 'Belum ada pengajuan yang tersedia.',
  SkeletonComponent,
}: UnifiedSubmissionTableProps<T>) {
  // Base columns (shared across all roles)
  const baseColumns: Column<T>[] = useMemo(
    () => [
      {
        key: 'created_at',
        header: 'Tanggal',
        sortable: true,
        minWidth: 120,
        className: 'whitespace-nowrap px-3 py-2',
        cell: (s) => formatSubmissionDate(s.created_at instanceof Date ? s.created_at.toISOString() : s.created_at),
      },
      {
        key: 'vendor_and_officer',
        header: 'Vendor & Penanggung Jawab',
        minWidth: 200,
        className: 'px-3 py-2',
        cell: (s) => (
          <div className="max-w-48">
            <div
              className="font-medium text-sm text-gray-900 truncate"
              title={s.vendor_name}
            >
              {s.vendor_name}
            </div>
            <div
              className="text-xs text-gray-500 truncate"
              title={s.officer_name}
            >
              {s.officer_name}
            </div>
          </div>
        ),
      },
      {
        key: 'job_description',
        header: 'Pekerjaan & Lokasi',
        minWidth: 220,
        className: 'px-3 py-2',
        cell: (s) => (
          <div className="max-w-56">
            <div
              className="font-medium text-sm text-gray-900 truncate"
              title={s.job_description}
            >
              {s.job_description}
            </div>
            <div
              className="text-xs text-gray-500 mt-1 truncate"
              title={s.work_location}
            >
              {s.work_location}
            </div>
          </div>
        ),
      },
      {
        key: 'review_status',
        header: 'Status Review',
        sortable: true,
        minWidth: 140,
        className: 'whitespace-nowrap px-3 py-2',
        cell: (s) => <ReviewStatusBadge status={s.review_status} />,
      },
      {
        key: 'approval_status',
        header: 'Status Final',
        sortable: true,
        minWidth: 130,
        className: 'whitespace-nowrap px-3 py-2',
        cell: (s) => <ApprovalStatusBadge status={s.approval_status} />,
      },
    ],
    []
  );

  // Optional scan column (for Reviewer, Verifier)
  const scanColumn: Column<T> = useMemo(
    () => ({
      key: 'scan_count',
      header: 'Scan',
      sortable: false,
      className: 'whitespace-nowrap text-center px-3 py-2',
      minWidth: 80,
      align: 'center',
      cell: (s) => {
        const scanCount = (s as any).scan_count;
        return (
          <div className="text-sm text-gray-900">
            {scanCount !== undefined ? scanCount : '-'}
          </div>
        );
      },
    }),
    []
  );

  // Action column (always present)
  const actionColumn: Column<T> = useMemo(
    () => ({
      key: 'actions',
      header: 'Aksi',
      align: 'center',
      minWidth: 184,
      className: 'px-3 py-2 whitespace-nowrap',
      cell: (s) => {
        const isPending = pendingCondition(s);
        return (
          <div className="flex items-center justify-center">
            <TableActionButton
              label={isPending ? actionLabelPending : actionLabelCompleted}
              pending={isPending}
              onClick={() => onOpenDetail(s.id)}
            />
          </div>
        );
      },
    }),
    [onOpenDetail, pendingCondition, actionLabelPending, actionLabelCompleted]
  );

  // Compose final columns
  const columns = useMemo(() => {
    const cols = [...baseColumns];
    if (showScanColumn) {
      cols.push(scanColumn);
    }
    cols.push(actionColumn);
    return cols;
  }, [baseColumns, showScanColumn, scanColumn, actionColumn]);

  // Show skeleton during loading
  if (loading && SkeletonComponent) {
    return <SkeletonComponent />;
  }

  // Prepare props
  const sortByProp =
    typeof sortBy === 'string' && sortBy.length > 0 ? { sortBy } : {};
  const paginationProp =
    pages > 1 && onPageChange
      ? {
          pagination: { page, pages, limit, total, onPageChange },
        }
      : {};

  return (
    <ReusableTable<T>
      columns={columns}
      data={data}
      {...sortByProp}
      sortOrder={sortOrder}
      onSortChange={(field, order) =>
        onSortChange?.(field as keyof T, order)
      }
      empty={{
        title: emptyTitle,
        description: emptyDescription,
        icon: (
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
        ),
      }}
      {...paginationProp}
      rowKey={(row) => row.id}
    />
  );
}
