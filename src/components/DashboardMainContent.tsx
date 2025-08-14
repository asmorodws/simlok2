"use client";

import { useSession } from "next-auth/react";
import { PlusIcon, ChartPieIcon, ClockIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import Card from "./ui/Card";
import { SectionTitle } from "./ui/SectionTitle";
import { Stat } from "./ui/Stat";
import { ActivityList } from "./ui/ActivityList";
import PageHeader from "./PageHeader";

export default function DashboardMainContent() {
  const { data: session } = useSession();
  const role = session?.user.role ?? "VENDOR";

  const stats = [
    { label: "Products", value: 42, icon: ChartPieIcon },
    { label: "Orders", value: 128, icon: ClockIcon },
    { label: "Earnings", value: "$3,210", icon: ArrowTrendingUpIcon },
    { label: "Pending", value: "$450", icon: PlusIcon },
  ];

  const activities = [
    { id: 1, txt: "Order #1234 confirmed", time: "1 m ago" },
    { id: 2, txt: "Charlie left review", time: "1 h ago" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main column */}
      <div className="space-y-6 lg:col-span-2">
        {/* Header */}
        <PageHeader
          title={`Welcome back, ${session?.user.nama_petugas ?? session?.user.name ?? "User"}!`}
          subtitle={`You are logged in as ${role.toLowerCase()}.`}
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
