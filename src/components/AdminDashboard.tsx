"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  UserGroupIcon, 
  ClipboardDocumentCheckIcon, 
  ChartBarIcon,
  CogIcon,
  PlusIcon,
  ArrowTrendingUpIcon
} from "@heroicons/react/24/outline";
import Card from "./ui/Card";
import { SectionTitle } from "./ui/SectionTitle";
import { Stat } from "./ui/Stat";
import PageHeader from "./PageHeader";

export default function AdminDashboard() {
  const { data: session } = useSession();

  const stats = [
    { label: "Total Users", value: "156", icon: UserGroupIcon },
    { label: "Vendors", value: "89", icon: PlusIcon },
    { label: "Verifiers", value: "12", icon: ClipboardDocumentCheckIcon },
    { label: "Pending", value: "23", icon: ArrowTrendingUpIcon },
  ];

  const adminMenus = [
    {
      title: "Kelola User",
      description: "Tambah, edit, dan hapus user vendor dan verifier",
      icon: UserGroupIcon,
      href: "/admin/users",
      color: "bg-blue-500"
    },
    {
      title: "Laporan Verifikasi",
      description: "Lihat laporan dan statistik verifikasi",
      icon: ClipboardDocumentCheckIcon,
      href: "/admin/reports",
      color: "bg-green-500"
    },
    {
      title: "Analytics",
      description: "Dashboard analitik dan metrik sistem",
      icon: ChartBarIcon,
      href: "/admin/analytics",
      color: "bg-purple-500"
    },
    {
      title: "Pengaturan Sistem",
      description: "Konfigurasi dan pengaturan aplikasi",
      icon: CogIcon,
      href: "/admin/settings",
      color: "bg-gray-500"
    }
  ];

  const recentActivities = [
    { id: 1, txt: "User baru vendor ditambahkan", time: "5 min ago", type: "user" },
    { id: 2, txt: "Verifikasi produk selesai", time: "15 min ago", type: "verification" },
    { id: 3, txt: "Laporan bulanan dibuat", time: "1 hour ago", type: "report" },
    { id: 4, txt: "User verifier login", time: "2 hours ago", type: "login" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Selamat datang, ${session?.user.nama_petugas ?? session?.user.name ?? "Admin"}!`}
        subtitle="Panel administrasi sistem SIMLOK"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Stat 
            key={index} 
            label={stat.label} 
            value={stat.value} 
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Menu */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <SectionTitle>Menu Administrasi</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {adminMenus.map((menu, index) => (
                <Link
                  key={index}
                  href={menu.href}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${menu.color} text-white group-hover:scale-110 transition-transform`}>
                      <menu.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                        {menu.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {menu.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <SectionTitle>Aksi Cepat</SectionTitle>
            <div className="flex flex-wrap gap-3 mt-4">
              <Link
                href="/admin/users"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <UserGroupIcon className="w-4 h-4 mr-2" />
                Tambah User
              </Link>
              <Link
                href="/admin/reports"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ClipboardDocumentCheckIcon className="w-4 h-4 mr-2" />
                Lihat Laporan
              </Link>
              <Link
                href="/admin/analytics"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ChartBarIcon className="w-4 h-4 mr-2" />
                Analytics
              </Link>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Activities */}
          <Card className="p-6">
            <SectionTitle>Aktivitas Terbaru</SectionTitle>
            <div className="space-y-3 mt-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'user' ? 'bg-blue-500' :
                    activity.type === 'verification' ? 'bg-green-500' :
                    activity.type === 'report' ? 'bg-purple-500' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.txt}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* System Status */}
          <Card className="p-6">
            <SectionTitle>Status Sistem</SectionTitle>
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Database</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">API Server</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Storage</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  85% Full
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
