/**
 * DashboardPageTemplate - Generic Template untuk semua Dashboard Pages
 * 
 * Menggabungkan RoleGate + SidebarLayout menjadi satu template reusable
 * Mengurangi duplikasi kode di setiap page
 */

import { ReactNode } from 'react';
import RoleGate from '@/components/layout/RoleGate';
import SidebarLayout from '@/components/layout/SidebarLayout';

type UserRole = 'VENDOR' | 'VERIFIER' | 'SUPER_ADMIN' | 'REVIEWER' | 'APPROVER' | 'VISITOR';

export interface DashboardPageTemplateProps {
  /** Allowed roles untuk akses page */
  allowedRoles: UserRole[];
  /** Title yang ditampilkan di sidebar header */
  sidebarTitle: string;
  /** Page identifier untuk sidebar (untuk highlighting menu aktif) */
  titlePage: string;
  /** Content yang akan dirender */
  children: ReactNode;
  /** Optional className untuk customization */
  className?: string;
}

/**
 * Template standar untuk semua dashboard pages
 * 
 * @example
 * ```tsx
 * export default function VendorPage() {
 *   return (
 *     <DashboardPageTemplate
 *       allowedRoles={['VENDOR']}
 *       sidebarTitle="Dashboard Vendor"
 *       titlePage="Vendor"
 *     >
 *       <YourContent />
 *     </DashboardPageTemplate>
 *   );
 * }
 * ```
 */
export default function DashboardPageTemplate({
  allowedRoles,
  sidebarTitle,
  titlePage,
  children,
  className = '',
}: DashboardPageTemplateProps) {
  return (
    <RoleGate allowedRoles={allowedRoles}>
      <SidebarLayout title={sidebarTitle} titlePage={titlePage}>
        <div className={className}>
          {children}
        </div>
      </SidebarLayout>
    </RoleGate>
  );
}
