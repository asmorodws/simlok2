/**
 * GenericFilterBar - Reusable Filter Component
 * 
 * Komponen reusable untuk filter bar dengan search, status filter, dan role filter
 */

import { ReactNode } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface GenericFilterBarProps {
  /** Search term */
  searchTerm?: string;
  /** Search change handler */
  onSearchChange?: (value: string) => void;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Status filter options */
  statusOptions?: FilterOption[];
  /** Current status filter */
  statusFilter?: string;
  /** Status filter change handler */
  onStatusChange?: (value: string) => void;
  /** Role filter options */
  roleOptions?: FilterOption[];
  /** Current role filter */
  roleFilter?: string;
  /** Role filter change handler */
  onRoleChange?: (value: string) => void;
  /** Additional custom filters */
  customFilters?: ReactNode;
  /** Show search */
  showSearch?: boolean;
  /** Show status filter */
  showStatusFilter?: boolean;
  /** Show role filter */
  showRoleFilter?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Generic filter bar component
 * 
 * @example
 * ```tsx
 * <GenericFilterBar
 *   searchTerm={search}
 *   onSearchChange={setSearch}
 *   searchPlaceholder="Cari user..."
 *   statusOptions={[
 *     { value: 'all', label: 'Semua' },
 *     { value: 'pending', label: 'Pending', count: 5 }
 *   ]}
 *   statusFilter={status}
 *   onStatusChange={setStatus}
 * />
 * ```
 */
export default function GenericFilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Cari...',
  statusOptions,
  statusFilter,
  onStatusChange,
  roleOptions,
  roleFilter,
  onRoleChange,
  customFilters,
  showSearch = true,
  showStatusFilter = true,
  showRoleFilter = false,
  className = '',
}: GenericFilterBarProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        {showSearch && onSearchChange && (
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        )}

        {/* Status Filter */}
        {showStatusFilter && statusOptions && onStatusChange && (
          <div className="flex-shrink-0">
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white min-w-[180px]"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {option.count !== undefined ? ` (${option.count})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Role Filter */}
        {showRoleFilter && roleOptions && onRoleChange && (
          <div className="flex-shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => onRoleChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white min-w-[180px]"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {option.count !== undefined ? ` (${option.count})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Filters */}
        {customFilters}
      </div>
    </div>
  );
}
