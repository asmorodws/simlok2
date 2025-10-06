"use client";

import { useSession } from "next-auth/react";
import { PlusIcon, ChartPieIcon, ClockIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import Card from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Stat } from "../ui/Stat";
import { ActivityList } from "../ui/ActivityList";
import PageHeader from "../layout/PageHeader";

export default function DashboardMainContent() {
  const { data: session } = useSession();
  const role = session?.user.role ?? "VENDOR";

  const stats = [
    { label: "Produk", value: 42, icon: ChartPieIcon },
    { label: "Pesanan", value: 128, icon: ClockIcon },
    { label: "Penghasilan", value: "$3,210", icon: ArrowTrendingUpIcon },
    { label: "Menunggu", value: "$450", icon: PlusIcon },
  ];

  const activities = [
    { id: 1, txt: "Order #1234 confirmed", time: "1 m ago" },
    { id: 2, txt: "Charlie left review", time: "1 h ago" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Debug info - remove in production */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className="lg:col-span-3 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Debug Session Info:</h3>
          <pre className="text-sm text-yellow-700 mt-2">
            {JSON.stringify({
              userId: session?.user?.id,
              nama_petugas: session?.user?.nama_petugas,
              nama_vendor: session?.user?.nama_vendor,
              role: session?.user?.role,
              email: session?.user?.email,
              isVerified: session?.user?.verified_at ? true : false,
            }, null, 2)}
          </pre>
        </div>
      )} */}
      
      {/* Main column */}
      <div className="space-y-6 lg:col-span-2">
        {/* Header */}
        <PageHeader
          title={`Welcome back, ${session?.user.officer_name ?? session?.user.name ?? "User"}!`}
          subtitle={
            role === "VENDOR" && session?.user.vendor_name 
              ? `${session.user.vendor_name} - You are logged in as ${role.toLowerCase()}.`
              : `You are logged in as ${role.toLowerCase()}.`
          }
          cta={
            <div className="flex gap-2">
              {["Add Product", "View Orders", "Analytics", "Support"].map((a) => (
                <button
                  key={a}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100 "
                >
                  {a}
                </button>
              ))}
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s, i) => (
            <Stat key={i} label={s.label} value={s.value} icon={s.icon as any} />
          ))}
        </div>

        {/* Simple placeholder for chart */}
        <Card className="p-6 bg-white border border-slate-200">
          <SectionTitle right={<ChartPieIcon className="h-5 w-5 text-slate-500" />}>
            Sales Trend
          </SectionTitle>
          <div className="mt-4 h-48 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartPieIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Chart will be displayed here</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Sidebar column */}
      <div className="space-y-6">
        {/* Vendor Info - only show for VENDOR role */}
        {role === "VENDOR" && (
          <Card className="p-6 bg-white border border-slate-200">
            <SectionTitle>Informasi Vendor</SectionTitle>
            <div className="space-y-3 mt-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Nama Vendor</span>
                <p className="text-sm text-gray-900 font-semibold">
                  {session?.user.vendor_name || "Belum diisi"}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Nama Petugas</span>
                <p className="text-sm text-gray-900">
                  {session?.user.officer_name || session?.user.name || "Belum diisi"}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Email</span>
                <p className="text-sm text-gray-900">
                  {session?.user.email || "Belum diisi"}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-white border border-slate-200">
          <SectionTitle>Recent Activity</SectionTitle>
          <ActivityList items={activities} />
        </Card>

        <Card className="p-6 bg-white border border-slate-200">
          <SectionTitle>Quick Stats</SectionTitle>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Conversion</span>
              <span className="font-bold text-slate-900">12%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Avg. Order</span>
              <span className="font-bold text-slate-900">$89</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
