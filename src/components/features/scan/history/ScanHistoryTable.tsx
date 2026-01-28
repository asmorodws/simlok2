'use client';

import React from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { format, formatDistanceToNow } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

import ReusableTable, { type Column } from '@/components/ui/table/ReusableTable';
import type { QrScan } from '@/types';

function StatusBadge({ status, type }: { status: string; type: 'review' | 'final' }) {
  if (type === 'review') {
    switch (status) {
      case 'PENDING_REVIEW': return <Badge variant="warning">Menunggu Review</Badge>;
      case 'MEETS_REQUIREMENTS': return <Badge variant="success">Memenuhi Syarat</Badge>;
      case 'NOT_MEETS_REQUIREMENTS': return <Badge variant="destructive">Tidak Memenuhi Syarat</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  }
  switch (status) {
    case 'PENDING_APPROVAL': return <Badge variant="warning">Menunggu Persetujuan</Badge>;
    case 'APPROVED': return <Badge variant="success">Disetujui</Badge>;
    case 'REJECTED': return <Badge variant="destructive">Ditolak</Badge>;
    default: return <Badge variant="default">{status}</Badge>;
  }
}

export interface ScanHistoryTableProps {
  scans: QrScan[];
  loading: boolean;

  page: number;
  pages: number;
  limit?: number;
  total?: number;

  onPrev: () => void;
  onNext: () => void;
  onPageChange?: (page: number) => void;

  renderAction?: (scan: QrScan) => React.ReactNode;

  emptyTitle?: string;
  emptyDescription?: string;

  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string, nextOrder: 'asc' | 'desc') => void;
}

export default function ScanHistoryTable({
  scans,
  loading,
  page,
  pages,
  limit = 15,
  total,
  onPrev,
  onNext,
  onPageChange,
  renderAction,
  emptyTitle = 'No scan history found',
  emptyDescription = 'No QR code scans match your current filters.',
  sortBy,
  sortOrder = 'desc',
  onSortChange,
}: ScanHistoryTableProps) {
  const columns: Column<QrScan>[] = [
    {
      key: 'simlok',
      header: 'No. Simlok',
      minWidth: '10rem',
      className: 'px-3 py-2',
      cell: (scan) => (
        <div className="text-sm font-semibold text-gray-900 truncate" title={scan.submission.simlok_number}>
          {scan.submission.simlok_number}
        </div>
      ),
      sortable: true,
      align: 'left',
    },
    {
      key: 'vendor_pekerjaan',
      header: 'Vendor & Pekerjaan',
      minWidth: '18rem',
      className: 'px-3 py-2',
      cell: (scan) => (
        <div className="space-y-0.5">
          <div className="text-sm text-gray-900 font-medium truncate" title={scan.submission.vendor_name}>
            {scan.submission.vendor_name}
          </div>
          <div className="text-xs text-gray-500 truncate max-w-[18rem]" title={scan.submission.job_description}>
            {scan.submission.job_description}
          </div>
        </div>
      ),
      sortable: false,
      align: 'left',
    },
    {
      key: 'verifikator',
      header: 'Verifikator',
      minWidth: '14rem',
      className: 'px-3 py-2',
      cell: (scan) => (
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-gray-900 truncate" title={scan.user.officer_name}>
            {scan.user.officer_name}
          </div>
          <div className="text-xs text-gray-500 truncate" title={scan.user.email}>
            {scan.user.email}
          </div>
        </div>
      ),
      sortable: false,
      align: 'left',
    },
    {
      key: 'waktu',
      header: 'Waktu Scan',
      minWidth: '12rem',
      className: 'px-3 py-2',
      sortable: true,
      cell: (scan) => (
        <div className="leading-tight">
          <div className="text-sm text-gray-900">
            {format(new Date(scan.scanned_at), 'dd/MM/yyyy HH:mm', { locale: localeID })}
          </div>
          <div className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(scan.scanned_at), { locale: localeID, addSuffix: true })}
          </div>
        </div>
      ),
      align: 'left',
    },
    {
      key: 'status',
      header: 'Status',
      minWidth: '9rem',
      className: 'px-3 py-2',
      cell: (scan) => {
        // Prioritize approval status if it's not pending, otherwise show review status
        const showApprovalStatus = scan.submission.approval_status !== 'PENDING_APPROVAL';
        if (showApprovalStatus) {
          return <StatusBadge status={scan.submission.approval_status} type="final" />;
        } else {
          return <StatusBadge status={scan.submission.review_status} type="review" />;
        }
      },
      sortable: false,
      align: 'left',
    },
    {
      key: 'aksi',
      header: 'Aksi',
      minWidth: 160,
      className: 'px-3 py-2',             // padding rapat
      align: 'center',                     // ⬅️ header & cell center
      cell: (scan) => (
        <div className="flex items-center justify-center"> {/* ⬅️ tombol center */}
          {renderAction ? (
            renderAction(scan)
          ) : (
            <Button variant="outline" size="sm" className="inline-flex items-center">
              <EyeIcon className="h-4 w-4 mr-1" />
              Lihat
            </Button>
          )}
        </div>
      ),
      sortable: false,
    },
    {
      key: 'spacer',
      header: '',
      minWidth: 8,
      className: 'px-0 py-0',
      cell: () => null,
      sortable: false,
      align: 'left',
    },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="animate-pulse space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="h-3.5 w-36 bg-gray-200 rounded" />
                <div className="h-3.5 w-60 bg-gray-200 rounded" />
                <div className="h-3.5 w-40 bg-gray-200 rounded" />
                <div className="h-3.5 w-32 bg-gray-200 rounded" />
                <div className="h-7 w-20 bg-gray-200 rounded ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pagination =
    pages > 1
      ? {
          page,
          pages,
          limit,
          total: total ?? pages * limit,
          onPageChange: (p: number) => {
            if (onPageChange) onPageChange(p);
            else {
              if (p < page) onPrev();
              if (p > page) onNext();
            }
          },
        }
      : undefined;

  return (
    <ReusableTable<QrScan>
      className="!rounded-xl !border !shadow-sm"
      columns={columns}
      data={scans}
      empty={{ title: emptyTitle, description: emptyDescription }}
      {...(sortBy ? { sortBy, sortOrder, onSortChange } : {})}
      {...(pagination ? { pagination } : {})}
      rowKey={(row) => row.id}
    />
  );
}
