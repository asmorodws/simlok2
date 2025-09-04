"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationDropdown from "@/components/header/NotificationDropdown";

import {
  HomeIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
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

  const menu = {
    ADMIN: [
      { label: "Dashboard", href: "/admin", icon: HomeIcon },
      { label: "Users", href: "/admin/users", icon: UsersIcon },
      { label: "Submissions", href: "/admin/submissions", icon: ClipboardDocumentListIcon },
      // { label: "Settings", href: "/admin/settings", icon: CogIcon },
    ],
    VENDOR: [
      { label: "Dashboard", href: "/vendor", icon: HomeIcon },
      { label: "Submissions", href: "/vendor/submissions", icon: ClipboardDocumentListIcon },
    ],
    VERIFIER: [
      { label: "Dashboard", href: "/verifier", icon: HomeIcon },
      // { label: "Documents", href: "/verifier/docs", icon: DocumentTextIcon },
      { label: "History", href: "/verifier/history", icon: ClockIcon },
    ],
  }[session?.user.role ?? "ADMIN"];

  return (
    <div className="flex h-screen ">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 h-full flex-col border-r border-slate-200 bg-white shadow-xl transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-800 md:relative md:flex ${
          sidebarOpen ? "flex w-64" : "hidden md:flex md:w-20"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
          {sidebarOpen && <h1 className="text-lg font-bold">{title}</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`rounded-md p-1 text-slate-600 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-300 dark:hover:bg-slate-700 ${
              sidebarOpen ? "ml-auto md:ml-auto" : "mx-auto"
            }`}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-2 py-6">
          {menu.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                title={item.label}
                className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-700 ${
                  active
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300"
                    : "text-slate-700 dark:text-slate-300"
                } ${!sidebarOpen ? "justify-center" : ""}`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Profile & Logout */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          <div className={`mb-4 flex items-center gap-3 ${!sidebarOpen && "justify-center"}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-300 text-sm font-bold text-white dark:bg-slate-600">
              {session?.user.name?.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div>
                <p className="truncate text-sm font-medium">{session?.user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{session?.user.role}</p>
              </div>
            )}
          </div>
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
        <header className="flex items-center bg-white  justify-between border-b border-slate-200 px-4 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-800 md:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1 text-slate-600 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500 md:hidden dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Open sidebar"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="text-xl font-semibold">{titlePage}</div>
          <NotificationDropdown /> 
        </header>

        {/* Content area */}
        <main className="min-h-0 flex-1  overflow-y-auto p-4 md:p-8 ">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
