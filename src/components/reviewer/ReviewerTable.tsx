'use client';

import { useMemo } from 'react';
import ReusableTable, {
  type Column,
  type SortOrder,
} from '@/components/table/ReusableTable';
import { Badge } from '@/components/ui/Badge';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import TableActionButton from '@/components/table/TableActionButton';

export interface ReviewerSubmission extends Record<string, unknown> {
  id: string;
  approval_status: string;
  review_status: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
  final_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  vendor_name: string;
  based_on: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation: string | null;
  working_hours: string;
  other_notes?: string;
  work_facilities: string;
  simja_number?: string;
  simja_date?: string | null;
  sika_number?: string;
  sika_date?: string | null;
  simlok_number?: string;
  simlok_date?: string | null;
  worker_names: string;
  content: string;
  notes?: string;
  review_note?: string;
  final_note?: string;
  sika_document_upload?: string;
  simja_document_upload?: string;
  qrcode?: string;
  created_at: string;
  reviewed_at?: string;
  approved_at?: string;

  // info scan (opsional di reviewer)
  scan_count?: number;
  last_scanned_at?: string | null;

  user: {
    officer_name: string;
    email: string;
    vendor_name: string;
  };
}

export interface ReviewerTableProps {
  data: ReviewerSubmission[];
  mode?: string;

  // sorting (opsional)
  sortBy?: keyof ReviewerSubmission | string;
  sortOrder?: SortOrder;
  onSortChange?: (field: keyof ReviewerSubmission | string, order: SortOrder) => void;

  // pagination (opsional)
  page?: number;
  pages?: number;
  limit?: number;
  total?: number;
  onPageChange?: (p: number) => void;

  // aksi
  onOpenDetail: (submissionId: string) => void;

  // optional scan column
  showScanStatus?: boolean;

  // button labels (opsional)
  reviewLabel?: string;
  viewLabel?: string;

  // empty state (opsional)
  emptyTitle?: string;
  emptyDescription?: string;
}

function ReviewStatusBadge({ status }: { status: ReviewerSubmission['review_status'] | string }) {
  switch (status) {
    case 'PENDING_REVIEW': return <Badge variant="warning">Menunggu Review</Badge>;
    case 'MEETS_REQUIREMENTS': return <Badge variant="success">Memenuhi Syarat</Badge>;
    case 'NOT_MEETS_REQUIREMENTS': return <Badge variant="destructive">Tidak Memenuhi Syarat</Badge>;
    default: return <Badge variant="default">{String(status)}</Badge>;
  }
}

function FinalStatusBadge({ status }: { status: ReviewerSubmission['final_status'] | string }) {
  switch (status) {
    case 'PENDING_APPROVAL': return <Badge variant="warning">Menunggu Persetujuan</Badge>;
    case 'APPROVED': return <Badge variant="success">Disetujui</Badge>;
    case 'REJECTED': return <Badge variant="destructive">Ditolak</Badge>;
    default: return <Badge variant="default">{String(status)}</Badge>;
  }
}

export default function ReviewerTable({
  data,
  sortBy,
  sortOrder = 'desc',
  onSortChange,
  page = 1,
  pages = 1,
  limit = 10,
  total = 0,
  onPageChange,
  onOpenDetail,
  showScanStatus = true,
  emptyTitle = 'Tidak ada pengajuan',
  emptyDescription = 'Belum ada pengajuan yang tersedia untuk di-review.',
}: ReviewerTableProps) {
  const baseColumns: Column<ReviewerSubmission>[] = useMemo(
    () => [
      {
        key: 'created_at',
        header: 'Tanggal',
        sortable: true,
        className: 'whitespace-nowrap',
        cell: (s) => (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {new Date(s.created_at).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(s.created_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        ),
      },
      {
        key: 'vendor_and_officer',
        header: 'Vendor & Penanggung Jawab',
        minWidth: 220,
        cell: (s) => (
          <div className="max-w-48">
            <div className="font-medium text-sm text-gray-900 truncate" title={s.vendor_name}>
              {s.vendor_name}
            </div>
            <div className="text-xs text-gray-500 mt-1 truncate" title={s.user?.officer_name}>
              {s.user?.officer_name ?? '-'}
            </div>
          </div>
        ),
      },
      {
        key: 'job_and_location',
        header: 'Pekerjaan & Lokasi',
        minWidth: 260,
        cell: (s) => (
          <div className="max-w-64">
            <div className="text-sm text-gray-900 font-medium truncate" title={s.job_description}>
              {s.job_description}
            </div>
            <div className="text-xs text-gray-500 mt-1 truncate" title={s.work_location}>
              {s.work_location}
            </div>
          </div>
        ),
      },
      {
        key: 'review_status',
        header: 'Status Review',
        sortable: true,
        className: 'whitespace-nowrap',
        cell: (s) => <ReviewStatusBadge status={s.review_status} />,
      },
      {
        key: 'final_status',
        header: 'Status Final',
        sortable: true,
        className: 'whitespace-nowrap',
        cell: (s) => <FinalStatusBadge status={s.final_status} />,
      },
    ],
    []
  );

  // Kolom aksi — header & isi DIBUAT TENGAH + lebar cukup
  const actionColumn: Column<ReviewerSubmission> = useMemo(
    () => ({
      key: 'actions',
      header: 'Aksi',
      align: 'center',                 // ⬅️ center-kan header
      minWidth: 176,                   // ⬅️ beri ruang cukup untuk tombol
      className: 'whitespace-nowrap text-center', // ⬅️ bantu alignment sel
      cell: (s) => {
        const pending = s.final_status === 'PENDING_APPROVAL';
        return (
          <div className="flex items-center justify-center"> {/* ⬅️ center-kan tombol */}
            <TableActionButton
              label={pending ? 'Review' : 'Lihat'}
              pending={pending}
              onClick={() => onOpenDetail(s.id)}
            />
          </div>
        );
      },
    }),
    [onOpenDetail]
  );

  const columns = useMemo(() => {
    const cols = [...baseColumns];
    cols.push(actionColumn);
    return cols;
  }, [baseColumns, actionColumn, showScanStatus]);

  // Hindari prop undefined (exactOptionalPropertyTypes)
  const sortByProp = typeof sortBy === 'string' && sortBy.length > 0 ? { sortBy } : {};
  const paginationProp =
    pages > 1 && onPageChange
      ? { pagination: { page, pages, limit, total, onPageChange } }
      : {};

  return (
    <ReusableTable<ReviewerSubmission>
      columns={columns}
      data={data}
      {...sortByProp}
      sortOrder={sortOrder}
      onSortChange={(field, order) =>
        onSortChange?.(field as keyof ReviewerSubmission, order)
      }
      empty={{
        title: emptyTitle,
        description: emptyDescription,
        icon: <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />,
      }}
      {...paginationProp}
      rowKey={(row) => row.id}
    />
  );
}
