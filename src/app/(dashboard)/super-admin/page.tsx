"use client";

import { useState, useEffect } from "react";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Link from "next/link";
import { UserData } from "@/types/user";
import { UserIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from "@heroicons/react/24/outline";
import ReviewerUserVerificationModal from "@/components/reviewer/ReviewerUserVerificationModal";
import EditUserModal from "@/components/admin/EditUserModal";
import DeleteUserModal from "@/components/admin/DeleteUserModal";
import { DashboardLoadingSkeleton } from "@/components/ui/LoadingSpinner";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPending: 0,
    totalVerified: 0,
    totalRejected: 0,
    todayRegistrations: 0,
    pendingVerifications: 0, // Legacy compatibility
    recentUsers: [] as UserData[]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUserVerificationModal, setShowUserVerificationModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // === Simple in-file button styles (tanpa komponen terpisah) ===
  const btnBase =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs px-4 py-2";
  const btnDetail =
    `${btnBase} text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-400`;
  const btnEdit =
    `${btnBase} text-gray-800 bg-white border border-gray-300 hover:bg-gray-100 focus-visible:ring-gray-400`;
  const btnHapus =
    `${btnBase} text-white bg-red-600 hover:bg-red-700 focus-visible:ring-red-600`;

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/dashboard/stats', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      const data = await response.json();
      setStats({
        totalUsers: data.totalUsers,
        totalPending: data.totalPending,
        totalVerified: data.totalVerified,
        totalRejected: data.totalRejected,
        todayRegistrations: data.todayRegistrations,
        pendingVerifications: data.pendingVerifications, // Legacy compatibility
        recentUsers: data.recentUsers
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Gagal memuat statistik dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleUserUpdate = (updatedUser: UserData) => {
    setStats(prev => ({
      ...prev,
      recentUsers: prev.recentUsers.map(user =>
        user.id === updatedUser.id ? updatedUser : user
      )
    }));
    fetchDashboardStats();
  };

  const handleUserDelete = (deletedUserId: string) => {
    setStats(prev => ({
      ...prev,
      recentUsers: prev.recentUsers.filter(user => user.id !== deletedUserId)
    }));
    fetchDashboardStats();
  };

  return (
    <RoleGate allowedRoles={["SUPER_ADMIN"]}>
      <SidebarLayout title="Super Admin Panel" titlePage="Dashboard">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Selamat Datang di Super Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Kelola seluruh user sistem SIMLOK dengan fitur CRUD lengkap.
            </p>
          </div>

          {/* Statistik Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {loading ? (
              <DashboardLoadingSkeleton type="stats" count={5} />
            ) : (
              <>
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Menunggu Verifikasi</h3>
                      <p className="text-2xl font-bold text-amber-600 mt-1">{stats.totalPending}</p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-full">
                      <ClockIcon className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                  {stats.totalPending > 0 && (
                    <div className="mt-4">
                      <Link
                        href="/super-admin/users?tab=pending"
                        className="text-sm text-amber-600 hover:text-amber-800 font-medium flex items-center"
                      >
                        Verifikasi sekarang
                        <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Terverifikasi</h3>
                      <p className="text-2xl font-bold text-green-600 mt-1">{stats.totalVerified}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Ditolak</h3>
                      <p className="text-2xl font-bold text-red-600 mt-1">{stats.totalRejected}</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full">
                      <XCircleIcon className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Total User</h3>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalUsers}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <UserIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Registrasi Hari Ini</h3>
                      <p className="text-2xl font-bold text-purple-600 mt-1">{stats.todayRegistrations}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <UserIcon className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Tabel User Terbaru */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">User Terbaru</h2>
              <p className="text-sm text-gray-600">Daftar 5 user yang baru mendaftar</p>
            </div>

            {loading ? (
              <DashboardLoadingSkeleton type="table" count={5} />
            ) : error ? (
              <div className="p-6 text-center text-red-500">{error}</div>
            ) : stats.recentUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Tidak ada user terbaru</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Petugas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor/Kontak</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Dibuat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Akun</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Verifikasi</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentUsers.filter(user => user.vendor_name !== "[DELETED VENDOR]").map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.officer_name}</div>
                          {user.address && <div className="text-sm text-gray-500 truncate max-w-xs">{user.address}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === 'VENDOR' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'VERIFIER' ? 'bg-green-100 text-green-800' :
                            user.role === 'REVIEWER' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'APPROVER' ? 'bg-orange-100 text-orange-800' :
                            user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.vendor_name ?? '-'}</div>
                          {user.phone_number && <div className="text-sm text-gray-500">{user.phone_number}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(user.created_at)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.verified_at || user.verification_status === 'VERIFIED' ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                              Terverifikasi
                            </span>
                          ) : user.rejection_reason || user.verification_status === 'REJECTED' ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-800">
                              Ditolak
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              Menunggu
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserVerificationModal(true);
                              }}
                              className={btnDetail}
                              title="Lihat Detail"
                            >
                              Lihat
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditUserModal(true);
                              }}
                              className={btnEdit}
                              title="Edit User"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteUserModal(true);
                              }}
                              className={btnHapus}
                              title="Delete User"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Link
                href="/super-admin/users"
                className="text-sm text-blue-60 hover:text-blue-800 font-medium flex items-center"
              >
                Lihat semua user
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Card untuk akses cepat ke fitur */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/super-admin/users"
              className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Kelola User</h3>
                  <p className="text-blue-100 text-sm mt-1">
                    CRUD user, verifikasi, dan role management
                  </p>
                </div>
                <UserIcon className="w-12 h-12 opacity-80" />
              </div>
            </Link>

            <Link
              href="/super-admin/logs"
              className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">System Logs</h3>
                  <p className="text-purple-100 text-sm mt-1">
                    Monitor aktivitas, errors, dan performa sistem
                  </p>
                </div>
                <svg className="w-12 h-12 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </Link>

            <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">System Health</h3>
                  <p className="text-gray-100 text-sm mt-1">
                    Cache, database, dan server monitoring
                  </p>
                </div>
                <svg className="w-12 h-12 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Modal User Verification */}
        <ReviewerUserVerificationModal
          user={selectedUser}
          isOpen={showUserVerificationModal}
          onClose={() => {
            setShowUserVerificationModal(false);
            setSelectedUser(null);
          }}
          onUserUpdate={handleUserUpdate}
        />

        {/* Modal Edit User */}
        <EditUserModal
          user={selectedUser}
          isOpen={showEditUserModal}
          onClose={() => {
            setShowEditUserModal(false);
            setSelectedUser(null);
          }}
          onUserUpdate={handleUserUpdate}
        />

        {/* Modal Delete User */}
        <DeleteUserModal
          user={selectedUser}
          isOpen={showDeleteUserModal}
          onClose={() => {
            setShowDeleteUserModal(false);
            setSelectedUser(null);
          }}
          onUserDelete={handleUserDelete}
        />
      </SidebarLayout>
    </RoleGate>
  );
}
