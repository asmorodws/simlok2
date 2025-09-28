"use client";

import React, { ReactNode, useState } from "react";

import { PageHeader, PageContainer } from "@/components/layout";
import { 
  DataTable, 
  LoadingState,
  type ColumnDef 
} from "@/components/ui";

interface FilterOption {
  key: string;
  label: string;
  value: string;
}

interface ListPageTemplateProps<T = any> {
  // Page configuration
  title: string;
  subtitle?: string;
  description?: string;
  
  // Data configuration
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  error?: string;
  
  // Search configuration
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filter configuration
  filters?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
  
  // Pagination configuration
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
  
  // Actions configuration
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning" | "info";
  }>;
  
  // Bulk actions configuration
  bulkActions?: Array<{
    label: string;
    onClick: (selectedIds: string[]) => void;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning" | "info";
  }>;
  
  // Custom content
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  
  // Empty state configuration
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateAction?: {
    label: string;
    onClick: () => void;
  };
  
  className?: string;
}

export default function ListPageTemplate<T extends Record<string, any>>({
  title,
  subtitle,
  description,
  data,
  columns,
  loading = false,
  error,
  searchable = true,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Cari...",
  filters = [],
  activeFilter,
  onFilterChange,
  pagination,
  primaryAction,
  secondaryActions = [],
  bulkActions = [],
  headerContent,
  footerContent,
  emptyStateTitle,
  className = ""
}: ListPageTemplateProps<T>) {
  const [selectedItems] = useState<string[]>([]);

  // Generate header actions
  const headerActions = [
    ...secondaryActions,
    ...(primaryAction ? [{
      ...primaryAction,
      variant: "primary" as const
    }] : [])
  ];

  // Generate table actions
  const tableActions: Array<{
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning" | "info";
  }> = [];

  // Add bulk actions if items are selected
  if (selectedItems.length > 0 && bulkActions.length > 0) {
    bulkActions.forEach(action => {
      tableActions.push({
        label: `${action.label} (${selectedItems.length})`,
        onClick: () => action.onClick(selectedItems),
        variant: action.variant || "outline"
      });
    });
  }

  // For now, use columns as-is (bulk selection can be implemented later)
  const tableColumns = columns;

  if (loading) {
    return (
      <PageContainer className={className}>
        <PageHeader title={title} subtitle={subtitle} description={description} />
        <LoadingState text="Memuat data..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer className={className}>
        <PageHeader title={title} subtitle={subtitle} description={description} />
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className={className}>
      {/* Header */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        description={description}
        secondaryActions={headerActions}
      >
        {headerContent}
      </PageHeader>

      {/* Filters */}
      {filters.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onFilterChange?.("")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !activeFilter 
                  ? "bg-blue-100 text-blue-700 border border-blue-300" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Semua
            </button>
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => onFilterChange?.(filter.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === filter.value 
                    ? "bg-blue-100 text-blue-700 border border-blue-300" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <DataTable
        data={data}
        columns={tableColumns}
        loading={loading}
        emptyMessage={emptyStateTitle || "Tidak ada data"}
        searchable={searchable}
        searchValue={searchValue}
        onSearchChange={onSearchChange || (() => {})}
        searchPlaceholder={searchPlaceholder}
        pagination={pagination}
        actions={tableActions}
      />

      {/* Footer Content */}
      {footerContent && (
        <div>{footerContent}</div>
      )}
    </PageContainer>
  );
}