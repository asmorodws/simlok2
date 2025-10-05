'use client';

import { useMemo } from 'react';
import ReusableTable, {
  type Column,
  type SortOrder,
} from '@/components/table/ReusableTable';
import { Badge } from '@/components/ui/Badge';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import TableActionButton from '@/components/table/TableActionButton';

export interface ApproverSubmission extends Record<string, unknown> {
  id: string;
  approval_status: string;
  review_status:
    | 'PENDING_REVIEW'
    | 'MEETS_REQUIREMENTS'
    | 'NOT_MEETS_REQUIREMENTS';
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
  updated_at?: string;
  reviewed_at?: string | null;
  approved_at?: string | null;
  reviewed_by?: string | null;
  approved_by?: string | null;
  workers?: Array<{
    id: string;
    worker_name: string;
    worker_photo: string | null;
  }>;
}

export interface ApproverTableProps {
  data: ApproverSubmission[];

  // sorting (opsional)
  sortBy?: keyof ApproverSubmission | string;
  sortOrder?: SortOrder;
  onSortChange?: (
    field: keyof ApproverSubmission | string,
    order: SortOrder
  ) => void;

  // pagination (opsional)
  page?: number;
  pages?: number;
  limit?: number;
  total?: number;
  onPageChange?: (p: number) => void;

  // aksi
  onOpenDetail: (submissionId: string) => void;

  // empty state (opsional)
  emptyTitle?: string;
  emptyDescription?: string;
}

function ReviewStatusBadge({
  status,
}: {
  status: ApproverSubmission['review_status'] | string;
}) {
  switch (status) {
    case 'PENDING_REVIEW':
      return <Badge variant="warning">Menunggu Review</Badge>;
    case 'MEETS_REQUIREMENTS':
      return <Badge variant="success">Memenuhi Syarat</Badge>;
    case 'NOT_MEETS_REQUIREMENTS':
      return <Badge variant="destructive">Tidak Memenuhi Syarat</Badge>;
    default:
      return <Badge variant="default">{String(status)}</Badge>;
  }
}

function FinalStatusBadge({
  status,
}: {
  status: ApproverSubmission['final_status'] | string;
}) {
  switch (status) {
    case 'PENDING_APPROVAL':
      return <Badge variant="warning">Menunggu Persetujuan</Badge>;
    case 'APPROVED':
      return <Badge variant="success">Disetujui</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Ditolak</Badge>;
    default:
      return <Badge variant="default">{String(status)}</Badge>;
  }
}

export default function ApproverTable({
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
  emptyTitle = 'Tidak ada pengajuan',
  emptyDescription = 'Belum ada pengajuan yang perlu disetujui.',
}: ApproverTableProps) {
  const columns: Column<ApproverSubmission>[] = useMemo(
    () => [
      {
        key: 'created_at',
        header: 'Tanggal',
        sortable: true,
        minWidth: 120,
        className: 'whitespace-nowrap px-3 py-2',
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
              className="text-xs text-gray-500 mt-1 truncate"
              title={s.officer_name}
            >
              {s.officer_name}
            </div>
          </div>
        ),
      },
      {
        key: 'job_and_location',
        header: 'Pekerjaan & Lokasi',
        minWidth: 240,
        className: 'px-3 py-2',
        cell: (s) => (
          <div className="max-w-64">
            <div
              className="text-sm text-gray-900 font-medium truncate"
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
        key: 'final_status',
        header: 'Status Final',
        sortable: true,
        minWidth: 130,
        className: 'whitespace-nowrap px-3 py-2',
        cell: (s) => <FinalStatusBadge status={s.final_status} />,
      },
      {
        key: 'actions',
        header: 'Aksi',
        align: 'center',                  // ⬅️ header & cell center
        minWidth: 184,                    // ⬅️ cukup lebar utk 1 tombol + icon
        className: 'px-3 py-2 whitespace-nowrap',
        cell: (s) => {
          const pending = s.final_status === 'PENDING_APPROVAL';
          return (
            <div className="flex items-center justify-center"> {/* ⬅️ tombol center */}
              <TableActionButton
                label={pending ? 'Review' : 'Lihat'}
                pending={pending}
                onClick={() => onOpenDetail(s.id)}
              />
            </div>
          );
        },
      },
    ],
    [onOpenDetail]
  );

  // Hindari prop undefined (exactOptionalPropertyTypes)
  const sortByProp =
    typeof sortBy === 'string' && sortBy.length > 0 ? { sortBy } : {};
  const paginationProp =
    pages > 1 && onPageChange
      ? {
          pagination: { page, pages, limit, total, onPageChange },
        }
      : {};

  return (
    <ReusableTable<ApproverSubmission>
      columns={columns}
      data={data}
      {...sortByProp}
      sortOrder={sortOrder}
      onSortChange={(field, order) =>
        onSortChange?.(field as keyof ApproverSubmission, order)
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
