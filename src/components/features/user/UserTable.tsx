'use client';

import ReusableTable, { type Column, type SortOrder } from '@/components/ui/table/Table';
import Button from '@/components/ui/button/Button';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { UserData } from '@/types';
import { useMemo } from 'react';

export interface UserTableProps {
  data: UserData[];
  sortBy?: keyof UserData | string;
  sortOrder?: SortOrder;
  onSortChange?: (field: keyof UserData | string, order: SortOrder) => void;
  page?: number;
  pages?: number;
  limit?: number;
  total?: number;
  onPageChange?: (p: number) => void;

  formatDate: (date: string | Date | null | undefined) => string;
  getRoleBadge: (role: UserData['role'] | string) => React.ReactNode;
  getVerificationStatus: (user: UserData) => React.ReactNode;
  getAccountStatus: (user: UserData) => React.ReactNode;

  onOpenVerify: (user: UserData) => void;
  onEdit?: (user: UserData) => void;

  emptyTitle?: string;
  emptyDescription?: string;
}

export default function UserTable({
  data,
  sortBy,
  sortOrder = 'desc',
  onSortChange,
  page = 1,
  pages = 1,
  limit = 10,
  total = 0,
  onPageChange,
  formatDate,
  getRoleBadge,
  getVerificationStatus,
  getAccountStatus,
  onOpenVerify,
  onEdit,
  emptyTitle = 'Tidak ada user',
  emptyDescription = 'Coba ubah kata kunci pencarian atau filter.',
}: UserTableProps) {
  const columns: Column<UserData>[] = useMemo(
    () => [
      {
        key: 'officer_name',
        header: 'Nama Petugas',
        sortable: true,
        minWidth: 200,
        cell: (u) => (
          <div className="whitespace-nowrap">
            <div className="text-sm font-medium text-gray-900">{u.officer_name}</div>
            {u.address && (
              <div className="text-sm text-gray-500 truncate max-w-xs">{u.address}</div>
            )}
          </div>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
        minWidth: 200, // sedikit dipersempit
        cell: (u) => (
          <div className="text-sm text-gray-900 truncate max-w-[18rem]" title={u.email}>
            {u.email}
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Peran',
        sortable: true,
        minWidth: 120,
        cell: (u) => getRoleBadge(u.role),
      },
      {
        key: 'vendor',
        header: 'Vendor/Kontak',
        minWidth: 190, // dipersempit agar beri ruang ke kolom Status
        cell: (u) => (
          <div className="whitespace-nowrap">
            <div className="text-sm text-gray-900 truncate max-w-[16rem]" title={u.vendor_name ?? '-'}>
              {u.vendor_name ?? '-'}
            </div>
            {u.phone_number && <div className="text-sm text-gray-500">{u.phone_number}</div>}
          </div>
        ),
      },
      {
        key: 'created_at',
        header: 'Tgl Dibuat',
        sortable: true,
        minWidth: 112,
        cell: (u) => <div className="text-sm text-gray-900">{formatDate(u.created_at)}</div>,
      },
      {
        key: 'isActive',
        header: 'Status Akun',
        sortable: true,
        minWidth: 120,
        className: 'whitespace-nowrap',
        cell: (u) => (
          <div className="inline-flex items-center whitespace-nowrap text-xs leading-none">
            {getAccountStatus(u)}
          </div>
        ),
      },
      {
        key: 'verification_status',
        header: 'Status Verifikasi',
        sortable: true,
        minWidth: 150,
        className: 'whitespace-nowrap',
        cell: (u) => (
          <div className="inline-flex items-center whitespace-nowrap text-xs leading-none">
            {getVerificationStatus(u)}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Aksi',
        align: 'center',
        minWidth: onEdit ? 220 : 176,
        className: 'text-center',
        cell: (u) => (
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={() => onOpenVerify(u)}
              variant="info"
              size="sm"
              className="px-3 py-1.5 whitespace-nowrap"
            >
              Lihat
            </Button>
            {onEdit && (
              <Button
                onClick={() => onEdit(u)}
                variant="outline"
                size="sm"
                className="px-3 py-1.5 whitespace-nowrap"
              >
                Ubah
              </Button>
            )}
          </div>
        ),
      },
    ],
    [formatDate, getRoleBadge, getVerificationStatus, getAccountStatus, onOpenVerify, onEdit]
  );
  const sortByString = typeof sortBy === 'string' ? sortBy : (sortBy as string | undefined);
  const sortByProp = sortByString ? { sortBy: sortByString } : {};

  const paginationProp =
    pages > 1 && onPageChange
      ? { pagination: { page, pages, limit, total, onPageChange } }
      : {};

  return (
    <ReusableTable<UserData>
      columns={columns}
      data={data}
      {...sortByProp}
      sortOrder={sortOrder}
      onSortChange={(field, order) => onSortChange?.(field as keyof UserData, order)}
      empty={{
        title: emptyTitle,
        description: emptyDescription,
        icon: <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />,
      }}
      {...paginationProp}
      rowKey={(row) => row.id}
    />
  );
}
