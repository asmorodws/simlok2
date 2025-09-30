"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationsBell from "@/components/notifications/NotificationsBell";

import {
  HomeIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  QrCodeIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface Props {
  children: React.ReactNode;
  title: string;
  titlePage?: string;
}

export default function SidebarLayout({ children, title, titlePage}: Props) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start with false for mobile-first

  const handleLinkClick = () => {
    // Close sidebar on mobile after clicking a link
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Define menu type
  type MenuItem = {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  };

  type MenuConfig = {
    SUPER_ADMIN: MenuItem[];
    REVIEWER: MenuItem[];
    APPROVER: MenuItem[];
    VENDOR: MenuItem[];
    VERIFIER: MenuItem[];
  };

  const menuConfig: MenuConfig = {
    SUPER_ADMIN: [
      { label: "Dashboard", href: "/super-admin", icon: HomeIcon },
      { label: "User Management", href: "/super-admin/users", icon: UsersIcon },
    ],
    REVIEWER: [
      { label: "Dashboard", href: "/reviewer", icon: HomeIcon },
      { label: "Review Pengajuan", href: "/reviewer/submissions", icon: ClipboardDocumentListIcon },
      { label: "Verifikasi User", href: "/reviewer/users", icon: UsersIcon },
      { label: "Scan History", href: "/reviewer/scan-history", icon: QrCodeIcon },
    ],
    APPROVER: [
      { label: "Dashboard", href: "/approver", icon: HomeIcon },
      { label: "Persetujuan", href: "/approver/submissions", icon: ClipboardDocumentListIcon },
      { label: "Scan History", href: "/approver/scan-history", icon: QrCodeIcon },
    ],
    VENDOR: [
      { label: "Dashboard", href: "/vendor", icon: HomeIcon },
      { label: "Submissions", href: "/vendor/submissions", icon: ClipboardDocumentListIcon },
    ],
    VERIFIER: [
      { label: "Dashboard", href: "/verifier", icon: HomeIcon },
      { label: "History", href: "/verifier/history", icon: ClockIcon },
    ],
  };

  const userRole = session?.user?.role as keyof MenuConfig | undefined;
  const menu = userRole ? menuConfig[userRole] : menuConfig.SUPER_ADMIN;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 h-full flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-300 ease-in-out md:relative md:flex ${
          sidebarOpen ? "flex w-64" : "hidden md:flex md:w-20"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          {sidebarOpen && <h1 className="text-lg font-bold">{title}</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`rounded-md p-1 text-slate-600 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500 ${
              sidebarOpen ? "ml-auto md:ml-auto" : "mx-auto"
            }`}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-2 py-6">
          {menu.map((item: MenuItem) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                title={item.label}
                className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  active
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-700"
                } ${!sidebarOpen ? "justify-center" : ""}`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Profile & Logout */}
        <div className="border-t border-slate-200 p-4">
          <Link 
            href="/profile" 
            className={`mb-4 flex items-center gap-3 ${!sidebarOpen && "justify-center"} hover:bg-slate-100 p-2 rounded-md transition-colors`}
            onClick={handleLinkClick}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-300 text-sm font-bold text-white">
              {session?.user.name?.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div>
                <p className="truncate text-sm font-medium">{session?.user.name}</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className={`w-full rounded-md bg-red-600 py-2 text-sm font-medium text-white outline-none transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 ${
              !sidebarOpen ? "px-0 flex justify-center" : ""
            }`}
          >
            {sidebarOpen ? "Logout" : <span className="text-xs">⏻</span>}
          </button>
        </div>
      </aside>

      {/* Main wrapper */}
      <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${
        sidebarOpen ? "md:ml-0" : "md:ml-0"
      }`}>
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-slate-200 px-3 py-3 bg-white md:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1 text-slate-600 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500 md:hidden"
            aria-label="Open sidebar"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="text-xl font-semibold">{titlePage}</div>
          {session?.user?.role !== "SUPER_ADMIN" && (
            <NotificationsBell />
          )}
        </header>

        {/* Content area */}
        <main className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8 ">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
