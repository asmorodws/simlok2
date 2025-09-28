"use client";

import { useState, useEffect } from "react";
import DashboardTemplate from '@/components/layout/DashboardTemplate';
import { UserData } from "@/types/user";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingVerifications: 0,
    recentUsers: [] as UserData[]
  });
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardStats();
  }, []);

  // Prepare stats for StatsGrid
  const statsData = [
    {
      id: "total-users",
      label: "Total User",
      value: stats.totalUsers || 0,
      color: "blue" as const
    },
    {
      id: "verified", 
      label: "User Terverifikasi", 
      value: (stats.totalUsers - stats.pendingVerifications) || 0,
      color: "green" as const
    },
    {
      id: "pending",
      label: "Menunggu Verifikasi",
      value: stats.pendingVerifications || 0,
      color: "yellow" as const,
      onClick: () => window.location.href = "/super-admin/users?tab=pending"
    }
  ];

  // Prepare recent users for DataTable
  const usersColumns = [
    { 
      key: "user_info", 
      header: "Nama & Vendor",
      cell: (row: any) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.user_info.primary}</div>
          {row.user_info.secondary && (
            <div className="text-sm text-gray-500">{row.user_info.secondary}</div>
          )}
        </div>
      )
    },
    { 
      key: "email", 
      header: "Email",
      accessor: "email" 
    },
    { 
      key: "role", 
      header: "Role",
      cell: (row: any) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          row.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
          row.role === 'VENDOR' ? 'bg-blue-100 text-blue-800' :
          row.role === 'VERIFIER' ? 'bg-green-100 text-green-800' :
          row.role === 'REVIEWER' ? 'bg-indigo-100 text-indigo-800' :
          row.role === 'APPROVER' ? 'bg-orange-100 text-orange-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {row.role}
        </span>
      )
    },
    { 
      key: "created_at", 
      header: "Tanggal Daftar",
      accessor: "created_at"
    },
    { 
      key: "status", 
      header: "Status",
      cell: (row: any) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          row.status === 'Terverifikasi' ? 'bg-green-100 text-green-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {row.status}
        </span>
      )
    },
    { 
      key: "actions", 
      header: "Aksi",
      cell: (row: any) => (
        <button 
          onClick={() => window.location.href = `/super-admin/users?view=${row.id}`}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Detail
        </button>
      )
    }
  ];

  const usersData = stats.recentUsers.map((user) => ({
    id: user.id,
    user_info: {
      primary: user.officer_name,
      secondary: user.vendor_name || null
    },
    email: user.email,
    role: user.role,
    created_at: new Date(user.created_at).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    status: user.verified_at ? 'Terverifikasi' : 'Menunggu'
  }));

  const headerActions = [
    {
      label: "Kelola Semua User",
      onClick: () => window.location.href = "/super-admin/users",
      variant: "primary" as const
    },
    {
      label: "Verifikasi User",
      onClick: () => window.location.href = "/super-admin/users?tab=pending",
      variant: "secondary" as const
    }
  ];

  const usersTable = {
    title: "User Terbaru",
    data: usersData,
    columns: usersColumns,
    loading: loading,
    emptyMessage: "Tidak ada user terbaru"
  };

  // Quick action cards
  const customSections = [
    <div key="quick-actions" className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <button 
        onClick={() => window.location.href = "/super-admin/users"}
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow text-left"
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
      </button>

      <button 
        onClick={() => window.location.href = "/super-admin/users?tab=pending"}
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow text-left"
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
      </button>
    </div>
  ];

  return (
    <DashboardTemplate
      title="Selamat Datang di Super Admin Dashboard"
      subtitle="Kelola seluruh user sistem SIMLOK dengan fitur CRUD lengkap"
      stats={statsData}
      statsColumns={3}
      tables={[usersTable]}
      tablesLayout="single"
      headerActions={headerActions}
      customSections={customSections}
      loading={loading}
    />
  );
}