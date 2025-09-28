"use client";

import React, { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { PageHeader, PageContainer, StatsGrid } from "@/components/layout";
import { DataTable, LoadingState, type ColumnDef } from "@/components/ui";

interface StatConfig {
  id: string;
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
  loading?: boolean;
  onClick?: () => void;
  trend?: {
    value: string;
    type: "increase" | "decrease" | "neutral";
  };
}

interface TableConfig<T = any> {
  title: string;
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  emptyMessage?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning" | "info";
  }>;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

interface DashboardTemplateProps {
  // Header configuration
  title?: string;
  subtitle?: string;
  description?: string;
  headerActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning" | "info";
  }>;
  
  // Statistics configuration
  stats?: StatConfig[];
  statsColumns?: 1 | 2 | 3 | 4;
  
  // Tables configuration
  tables?: TableConfig[];
  tablesLayout?: "single" | "grid-2" | "grid-3" | "vertical";
  
  // Additional content
  customSections?: ReactNode[];
  
  // Loading states
  loading?: boolean;
  
  // Role-specific content
  role?: string;
  
  className?: string;
}

export default function DashboardTemplate({
  title,
  subtitle,
  description,
  headerActions = [],
  stats = [],
  statsColumns = 3,
  tables = [],
  tablesLayout = "grid-2",
  customSections = [],
  loading = false,
  className = ""
}: DashboardTemplateProps) {
  const { data: session } = useSession();

  // Generate welcome title based on role if not provided
  const getWelcomeTitle = () => {
    if (title) return title;
    
    const userName = session?.user.officer_name ?? session?.user.name ?? "User";
    return `Selamat datang, ${userName}`;
  };

  const getTablesGridClass = () => {
    switch (tablesLayout) {
      case "single": return "grid grid-cols-1";
      case "grid-2": return "grid grid-cols-1 lg:grid-cols-2";
      case "grid-3": return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      case "vertical": return "space-y-6";
      default: return "grid grid-cols-1 lg:grid-cols-2";
    }
  };

  if (loading) {
    return (
      <PageContainer className={className}>
        <LoadingState text="Memuat dashboard..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer className={className}>
      {/* Header */}
      <PageHeader
        title={getWelcomeTitle()}
        subtitle={subtitle}
        description={description}
        secondaryActions={headerActions.length > 0 ? headerActions : undefined}
      />

      {/* Statistics */}
      {stats.length > 0 && (
        <StatsGrid 
          stats={stats} 
          columns={statsColumns}
        />
      )}

      {/* Custom Sections */}
      {customSections.map((section, index) => (
        <div key={index}>
          {section}
        </div>
      ))}

      {/* Tables */}
      {tables.length > 0 && (
        <div className={`${getTablesGridClass()} gap-6`}>
          {tables.map((table, index) => (
            <DataTable
              key={index}
              title={table.title}
              data={table.data}
              columns={table.columns}
              loading={table.loading || false}
              emptyMessage={table.emptyMessage || "Tidak ada data"}
              actions={table.actions}
              searchable={table.searchable || false}
              searchValue={table.searchValue || ""}
              onSearchChange={table.onSearchChange || (() => {})}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}