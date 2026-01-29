/**
 * UserManagementPageTemplate - Generic Template untuk User Management Pages
 * 
 * Menggabungkan struktur yang sama untuk Admin dan Reviewer user management
 * Mengurangi duplikasi HTML/JSX yang sama
 */

import { ReactNode } from 'react';

export interface UserManagementPageTemplateProps {
  /** Title utama */
  title: string;
  /** Deskripsi subtitle */
  description: string;
  /** Content area (biasanya UserVerificationManagement component) */
  children: ReactNode;
  /** Optional header actions (button tambah user, dll) */
  headerActions?: ReactNode;
}

/**
 * Template untuk halaman User Management
 * Digunakan oleh Admin dan Reviewer pages
 * 
 * @example
 * ```tsx
 * <UserManagementPageTemplate
 *   title="Verifikasi User"
 *   description="Kelola dan verifikasi user vendor dalam sistem"
 * >
 *   <UserVerificationManagement />
 * </UserManagementPageTemplate>
 * ```
 */
export default function UserManagementPageTemplate({
  title,
  description,
  children,
  headerActions,
}: UserManagementPageTemplateProps) {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200/70">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {title}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {description}
              </p>
            </div>
            {headerActions && (
              <div className="flex items-center gap-3">
                {headerActions}
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
