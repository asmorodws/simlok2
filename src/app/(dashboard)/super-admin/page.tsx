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
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs px-3 py-1.5";
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
      const response = await fetch('/api/admin/dashboard-stats', { cache: 'no-store' });
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
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Menunggu Verifikasi</h3>
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold text-amber-600 mt-1">{stats.totalPending}</p>
                  )}
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <ClockIcon className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              {stats.totalPending > 0 && !loading && (
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
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold text-green-600 mt-1">{stats.totalVerified}</p>
                  )}
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
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold text-red-600 mt-1">{stats.totalRejected}</p>
                  )}
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
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalUsers}</p>
                  )}
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
                  {loading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold text-purple-600 mt-1">{stats.todayRegistrations}</p>
                  )}
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <UserIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabel User Terbaru */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">User Terbaru</h2>
              <p className="text-sm text-gray-600">Daftar 5 user yang baru mendaftar</p>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-500">{error}</div>
            ) : stats.recentUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Tidak ada user terbaru</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Daftar</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.officer_name}</div>
                          {user.vendor_name && (
                            <div className="text-sm text-gray-500">{user.vendor_name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === 'VENDOR' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'VERIFIER' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.verified_at || user.verification_status === 'VERIFIED' ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Terverifikasi
                            </span>
                          ) : user.rejection_reason || user.verification_status === 'REJECTED' ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              Ditolak
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              Menunggu
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserVerificationModal(true);
                              }}
                              className={btnDetail}
                              title="Lihat Detail"
                            >
                              Detail
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
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
              >
                Lihat semua user
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Card untuk akses cepat ke fitur */}
          
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
