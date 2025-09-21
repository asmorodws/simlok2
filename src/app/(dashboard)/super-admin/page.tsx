"use client";

import { useState, useEffect } from "react";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Link from "next/link";
import { UserData } from "@/types/user";
import { UserIcon, CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingVerifications: 0,
    recentUsers: [] as UserData[]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/dashboard-stats');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard statistics');
        }
        const data = await response.json();
        setStats({
          totalUsers: data.totalUsers,
          pendingVerifications: data.pendingVerifications,
          recentUsers: data.recentUsers
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Gagal memuat statistik dashboard');
      } finally {
        setLoading(false);
      }
    }

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 mr-4">
                  <UserIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total User</p>
                  {loading ? (
                    <div className="h-6 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 mr-4">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">User Terverifikasi</p>
                  {loading ? (
                    <div className="h-6 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers - stats.pendingVerifications}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 mr-4">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Menunggu Verifikasi</p>
                  {loading ? (
                    <div className="h-6 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingVerifications}</p>
                  )}
                </div>
              </div>
              {stats.pendingVerifications > 0 && (
                <div className="mt-4">
                  <Link
                    href="/super-admin/users?tab=pending"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                  >
                    Verifikasi sekarang
                    <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
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
                            user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
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
                          {user.verified_at ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Terverifikasi
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              Menunggu
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/super-admin/users?view=${user.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Detail
                          </Link>
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
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link 
              href="/super-admin/users" 
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Manajemen User</h2>
              <p className="text-gray-600 mb-4">
                Kelola semua pengguna sistem SIMLOK
              </p>
              <ul className="list-disc ml-5 text-gray-600 mb-4">
                <li>Menambah user baru dengan berbagai role</li>
                <li>Mengedit informasi user yang sudah ada</li>
                <li>Menghapus user yang tidak diperlukan</li>
              </ul>
            </Link>

            <Link 
              href="/super-admin/users?tab=pending" 
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Approval Vendor Baru</h2>
              <p className="text-gray-600 mb-4">
                Verifikasi pendaftaran vendor baru
              </p>
              <ul className="list-disc ml-5 text-gray-600 mb-4">
                <li>Melihat detail vendor yang mendaftar</li>
                <li>Menyetujui pendaftaran yang valid</li>
                <li>Menolak pendaftaran yang tidak sesuai</li>
              </ul>
            </Link>
          </div>
        </div>
      </SidebarLayout>
    </RoleGate>
  );
}
