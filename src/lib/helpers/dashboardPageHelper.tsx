/**
 * Utility untuk membuat dashboard page dengan struktur konsisten
 * Mengurangi boilerplate dan memastikan pattern yang sama di semua role pages
 */

import { Metadata } from 'next';
import { ReactNode } from 'react';
import RoleGate from '@/components/shared/security/RoleGate';
import SidebarLayout from '@/components/layout/SidebarLayout';

type UserRole = 'VENDOR' | 'VERIFIER' | 'SUPER_ADMIN' | 'REVIEWER' | 'APPROVER' | 'VISITOR';

interface DashboardPageConfig {
  /** Allowed roles untuk akses page */
  allowedRoles: UserRole[];
  /** Title untuk browser tab */
  title: string;
  /** Description untuk SEO */
  description: string;
  /** Title yang ditampilkan di sidebar header */
  sidebarTitle: string;
  /** Page identifier untuk sidebar */
  titlePage: string;
  /** Content component yang akan dirender */
  children: ReactNode;
}

/**
 * Generate metadata untuk dashboard page
 */
export function createDashboardMetadata(title: string, description: string): Metadata {
  return {
    title: `${title} - SIMLOK`,
    description,
  };
}

/**
 * Create dashboard page dengan RoleGate dan SidebarLayout
 * 
 * @example
 * ```tsx
 * export default function VendorPage() {
 *   return createDashboardPage({
 *     allowedRoles: ['VENDOR'],
 *     title: 'Dashboard Vendor',
 *     description: 'Halaman dashboard untuk vendor',
 *     sidebarTitle: 'Dashboard Vendor',
 *     titlePage: 'Vendor',
 *     children: <VendorDashboard />
 *   });
 * }
 * ```
 */
export function createDashboardPage({
  allowedRoles,
  sidebarTitle,
  titlePage,
  children,
}: Omit<DashboardPageConfig, 'title' | 'description'>) {
  return (
    <RoleGate allowedRoles={allowedRoles}>
      <SidebarLayout title={sidebarTitle} titlePage={titlePage}>
        {children}
      </SidebarLayout>
    </RoleGate>
  );
}

/**
 * Role-specific page creator helpers
 */
export const DashboardPageHelpers = {
  vendor: (children: ReactNode) => 
    createDashboardPage({
      allowedRoles: ['VENDOR'],
      sidebarTitle: 'Dashboard Vendor',
      titlePage: 'Vendor',
      children,
    }),

  approver: (children: ReactNode) =>
    createDashboardPage({
      allowedRoles: ['APPROVER', 'SUPER_ADMIN'],
      sidebarTitle: 'Dashboard Persetujuan',
      titlePage: 'Approver',
      children,
    }),

  reviewer: (children: ReactNode) =>
    createDashboardPage({
      allowedRoles: ['REVIEWER', 'SUPER_ADMIN'],
      sidebarTitle: 'Dashboard Review',
      titlePage: 'Reviewer',
      children,
    }),

  verifier: (children: ReactNode) =>
    createDashboardPage({
      allowedRoles: ['VERIFIER', 'SUPER_ADMIN'],
      sidebarTitle: 'Dashboard Verifikasi',
      titlePage: 'Verifier',
      children,
    }),

  visitor: (children: ReactNode) =>
    createDashboardPage({
      allowedRoles: ['VISITOR'],
      sidebarTitle: 'Dashboard Visitor',
      titlePage: 'Visitor',
      children,
    }),

  superAdmin: (children: ReactNode) =>
    createDashboardPage({
      allowedRoles: ['SUPER_ADMIN'],
      sidebarTitle: 'Dashboard Admin',
      titlePage: 'Super Admin',
      children,
    }),
};
