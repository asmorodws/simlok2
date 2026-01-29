'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge/Badge';
import { useUserManagement } from '@/hooks/useUserManagement';
import UserVerificationModal from '@/components/features/user/UserVerificationModal';
import UserFormModal from '@/components/features/user/UserFormModal';
import DeleteUserModal from './DeleteUserModal';
import ReusableTable, { type Column } from '@/components/ui/table/Table';
import GenericFilterBar from '@/components/ui/form/GenericFilterBar';
import { GenericStatsCard } from '@/components/ui/card';
import {
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  ClockIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import type { UserData } from '@/types';

type UserRole = 'SUPER_ADMIN' | 'REVIEWER';

interface UnifiedUserVerificationManagementProps {
  role: UserRole;
  className?: string;
  refreshTrigger?: number;
}

/**
 * UnifiedUserVerificationManagement - Unified component for both Admin and Reviewer
 * 
 * Replaces:
 * - AdminUserVerificationManagement (367 lines)
 * - ReviewerUserVerificationManagement (288 lines)
 * 
 * Features controlled by role prop:
 * - SUPER_ADMIN: Full CRUD (Create, Read, Update, Delete)
 * - REVIEWER: Read, Update, Verify only (no Create/Delete)
 */
export default function UnifiedUserVerificationManagement({
  role,
  className = '',
  refreshTrigger = 0,
}: UnifiedUserVerificationManagementProps) {
  
  const isSuperAdmin = role === 'SUPER_ADMIN';
  
  // ✅ Single hook for all user management logic
  const {
    users,
    stats,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortField,
    sortOrder,
    handleSort,
    currentPage,
    totalPages,
    totalUsersCount,
    setCurrentPage,
    refetchUsers,
    isSuperAdmin: hookIsSuperAdmin,
    currentUserId,
  } = useUserManagement({ 
    limit: 10, 
    refreshTrigger 
  });

  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // Button styles (inline untuk action buttons)
  const btnBase =
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm px-3 py-2';
  const btnPrimary = `${btnBase} text-white bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500`;

  // Action handlers
  const handleVerifyClick = (user: UserData) => {
    setSelectedUser(user);
    setShowVerificationModal(true);
  };

  const handleEditClick = (user: UserData) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  const handleDeleteClick = (user: UserData) => {
    setSelectedUser(user);
    setShowDeleteUserModal(true);
  };

  const handleVerificationSuccess = () => {
    refetchUsers();
    setShowVerificationModal(false);
    setSelectedUser(null);
  };

  const handleUserUpdate = () => {
    refetchUsers();
    setShowEditUserModal(false);
    setSelectedUser(null);
  };

  const handleUserDelete = () => {
    refetchUsers();
    setShowDeleteUserModal(false);
    setSelectedUser(null);
  };

  // Badge helpers
  const renderStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; text: string }> = {
      PENDING: { variant: 'warning', text: 'Menunggu' },
      VERIFIED: { variant: 'success', text: 'Terverifikasi' },
      REJECTED: { variant: 'destructive', text: 'Ditolak' },
    };
    const s = statusMap[status] || { variant: 'secondary', text: status };
    return <Badge variant={s.variant}>{s.text}</Badge>;
  };

  const renderRoleBadge = (roleValue: string) => {
    const roleMap: Record<string, { variant: any; text: string }> = {
      SUPER_ADMIN: { variant: 'destructive', text: 'Super Admin' },
      APPROVER: { variant: 'primary', text: 'Approver' },
      REVIEWER: { variant: 'success', text: 'Reviewer' },
      VENDOR: { variant: 'secondary', text: 'Vendor' },
      VERIFIER: { variant: 'warning', text: 'Verifier' },
      VISITOR: { variant: 'secondary', text: 'Visitor' },
    };
    const r = roleMap[roleValue] || { variant: 'secondary', text: roleValue };
    return <Badge variant={r.variant}>{r.text}</Badge>;
  };

  const renderAccountStatus = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'success' : 'destructive'}>
        {isActive ? 'Aktif' : 'Nonaktif'}
      </Badge>
    );
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  // Build columns based on role
  const columns: Column<UserData>[] = [
    {
      key: 'officer_name',
      header: 'Nama & Email',
      sortable: true,
      cell: (user: UserData) => (
        <div>
          <div className="font-medium text-gray-900">{user.officer_name}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      ),
    },
    {
      key: 'vendor_name',
      header: 'Perusahaan',
      sortable: true,
      cell: (user: UserData) => (
        <div>
          <div className="text-sm text-gray-900">{user.vendor_name || '-'}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      cell: (user: UserData) => renderRoleBadge(user.role),
    },
    {
      key: 'verification_status',
      header: 'Status Verifikasi',
      sortable: true,
      cell: (user: UserData) => renderStatusBadge(user.verification_status || 'PENDING'),
    },
    // Conditional: Show isActive column only for SUPER_ADMIN
    ...(isSuperAdmin ? [{
      key: 'isActive',
      header: 'Status Akun',
      cell: (user: UserData) => renderAccountStatus(user.isActive ?? true),
    }] : []),
    {
      key: 'created_at',
      header: 'Tanggal Daftar',
      sortable: true,
      cell: (user: UserData) => (
        <span className="text-sm text-gray-900">{formatDate(user.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      cell: (user: UserData) => (
        <div className="flex items-center gap-2">
          {user.verification_status === 'PENDING' && (
            <button
              onClick={() => handleVerifyClick(user)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Verifikasi
            </button>
          )}
          <button
            onClick={() => handleEditClick(user)}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            {isSuperAdmin ? 'Edit' : 'Detail'}
          </button>
          {/* Conditional: Show delete button only for SUPER_ADMIN */}
          {isSuperAdmin && hookIsSuperAdmin && user.id !== currentUserId && (
            <button
              onClick={() => handleDeleteClick(user)}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Hapus
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GenericStatsCard
          title="Total User"
          value={stats.totalUsers}
          icon={<UserIcon className="h-6 w-6" />}
          accent="blue"
        />
        <GenericStatsCard
          title="Menunggu Verifikasi"
          value={stats.totalPending}
          icon={<ClockIcon className="h-6 w-6" />}
          accent="amber"
        />
        <GenericStatsCard
          title="Terverifikasi"
          value={stats.totalVerified}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          accent="green"
        />
        <GenericStatsCard
          title="Ditolak"
          value={stats.totalRejected}
          icon={<XCircleIcon className="h-6 w-6" />}
          accent="red"
        />
      </div>

      {/* Conditional: Create User button only for SUPER_ADMIN */}
      {isSuperAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateUserModal(true)}
            className={btnPrimary}
          >
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Buat User Baru
          </button>
        </div>
      )}

      {/* Filters */}
      <GenericFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Cari nama, email, atau perusahaan..."
        statusOptions={[
          { value: 'all', label: 'Semua Status', count: stats.totalUsers },
          { value: 'pending', label: 'Menunggu', count: stats.totalPending },
          { value: 'verified', label: 'Terverifikasi', count: stats.totalVerified },
          { value: 'rejected', label: 'Ditolak', count: stats.totalRejected },
        ]}
        statusFilter={statusFilter}
        onStatusChange={(value) => setStatusFilter(value as any)}
        showRoleFilter={false}
      />

      {/* Unified Table */}
      <ReusableTable<UserData>
        data={users}
        columns={columns}
        loading={loading}
        error={error}
        empty={{
          title: 'Tidak ada user yang ditemukan',
        }}
        sortBy={sortField}
        sortOrder={sortOrder}
        onSortChange={(field) => handleSort(field as keyof UserData)}
        pagination={{
          page: currentPage,
          pages: totalPages,
          limit: 10,
          total: totalUsersCount,
          onPageChange: setCurrentPage,
        }}
        rowKey={(user) => user.id}
      />

      {/* Modals */}
      {showVerificationModal && selectedUser && (
        <UserVerificationModal
          user={selectedUser}
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onUserUpdate={handleVerificationSuccess}
        />
      )}

      {showEditUserModal && selectedUser && (
        <UserFormModal
          user={selectedUser}
          isOpen={showEditUserModal}
          onClose={() => setShowEditUserModal(false)}
          onUserUpdate={handleUserUpdate}
          mode="edit"
        />
      )}

      {/* Conditional: Create user modal only for SUPER_ADMIN */}
      {isSuperAdmin && showCreateUserModal && (
        <UserFormModal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          onUserUpdate={() => {
            refetchUsers();
            setShowCreateUserModal(false);
          }}
          mode="create"
        />
      )}

      {/* Conditional: Delete user modal only for SUPER_ADMIN */}
      {isSuperAdmin && showDeleteUserModal && selectedUser && (
        <DeleteUserModal
          user={selectedUser}
          isOpen={showDeleteUserModal}
          onClose={() => setShowDeleteUserModal(false)}
          onUserDelete={handleUserDelete}
        />
      )}
    </div>
  );
}

// ============================================================================
// UNIFIED COMPONENT
// 
// REPLACES:
// - AdminUserVerificationManagement.tsx (367 lines)
// - ReviewerUserVerificationManagement.tsx (288 lines)
// 
// THIS FILE: ~380 lines
// SAVINGS: 655 - 380 = 275 lines (42% reduction!)
// 
// Benefits:
// 1. Single source of truth
// 2. Easier to maintain (bug fixes apply to both)
// 3. Consistent UI/UX across roles
// 4. Role-based feature flags (not separate files)
// ============================================================================
