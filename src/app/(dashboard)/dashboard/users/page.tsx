'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  verification_status: string;
  company_name: string | null;
  company_npwp: string | null;
  officer_name: string | null;
  phone_number: string | null;
  created_at: string;
  verified_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [newRole, setNewRole] = useState('');
  const [processing, setProcessing] = useState(false);

  const hasPermission = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role || '');
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (hasPermission) {
      fetchUsers();
    }
  }, [page, roleFilter, statusFilter, hasPermission]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const response = await fetch(`/api/users?${params}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      } else {
        toast.error(data.error || 'Failed to fetch users');
      }
    } catch (error) {
      toast.error('An error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleVerify = async () => {
    if (!selectedUser) return;

    if (verifyAction === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: verifyAction,
          rejection_reason: verifyAction === 'reject' ? rejectionReason : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setShowVerifyModal(false);
        setSelectedUser(null);
        setRejectionReason('');
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to verify user');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setShowRoleModal(false);
        setSelectedUser(null);
        setNewRole('');
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to change role');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const openVerifyModal = (user: User, action: 'approve' | 'reject') => {
    setSelectedUser(user);
    setVerifyAction(action);
    setShowVerifyModal(true);
  };

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  if (!hasPermission) {
    return (
      <div className="text-center py-12">
        <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage users, verify accounts, and change roles</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, name, or company..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Roles</option>
            <option value="VENDOR">Vendor</option>
            <option value="VERIFIER">Verifier</option>
            <option value="REVIEWER">Reviewer</option>
            <option value="APPROVER">Approver</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          >
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No users found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.verification_status === 'VERIFIED'
                              ? 'bg-green-100 text-green-800'
                              : user.verification_status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {user.verification_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{user.company_name || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {user.verification_status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => openVerifyModal(user, 'approve')}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm text-green-700 hover:bg-green-50 rounded"
                              title="Approve"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openVerifyModal(user, 'reject')}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm text-red-700 hover:bg-red-50 rounded"
                              title="Reject"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {isSuperAdmin && user.id !== session?.user?.id && (
                          <button
                            onClick={() => openRoleModal(user)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-700 hover:bg-blue-50 rounded"
                            title="Change Role"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Verify Modal */}
      {showVerifyModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {verifyAction === 'approve' ? 'Approve User' : 'Reject User'}
            </h3>
            <p className="text-gray-600 mb-4">
              {verifyAction === 'approve'
                ? `Are you sure you want to approve ${selectedUser.name}?`
                : `Please provide a reason for rejecting ${selectedUser.name}:`}
            </p>
            {verifyAction === 'reject' && (
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4"
                rows={4}
              />
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setSelectedUser(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={processing}
                className={`px-4 py-2 text-white rounded-lg transition ${
                  verifyAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {processing ? 'Processing...' : verifyAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change User Role</h3>
            <p className="text-gray-600 mb-4">Select new role for {selectedUser.name}:</p>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-4"
            >
              <option value="VENDOR">Vendor</option>
              <option value="VERIFIER">Verifier</option>
              <option value="REVIEWER">Reviewer</option>
              <option value="APPROVER">Approver</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setNewRole('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleChangeRole}
                disabled={processing || newRole === selectedUser.role}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Change Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
