/**
 * Unified Skeleton Component
 * Merged from Skeleton.tsx + PageSkeleton.tsx + TableSkeleton.tsx
 * Reusable skeleton loading components for various UI elements
 */

import React from 'react';
import { cn } from '@/lib/helpers/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3, 
  className 
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('rounded-xl border bg-white p-6 shadow-sm', className)}>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
};

// Dashboard Loading Skeleton (from LoadingSpinner.tsx)
export const SkeletonDashboardCard: React.FC = () => (
  <div className="bg-white p-6 rounded-xl border shadow-sm animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-3 flex-1">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

// Table Skeleton (merged from TableSkeleton.tsx)
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

const SkeletonCell: React.FC<{ width?: string; height?: string; delay?: string }> = ({ 
  width = 'w-full', 
  height = 'h-4',
  delay = ''
}) => (
  <div 
    className={`${height} ${width} bg-gray-200 rounded animate-pulse ${delay}`} 
    style={{ animationDelay: delay ? `${Math.random() * 0.5}s` : '0s' }}
  />
);

const SkeletonRow: React.FC<{ columns: number; isHeader?: boolean; rowIndex?: number }> = ({ 
  columns, 
  isHeader = false,
  rowIndex = 0
}) => (
  <tr className={isHeader ? 'bg-gray-50' : 'bg-white'}>
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        {isHeader ? (
          <SkeletonCell 
            width={`w-${Math.floor(Math.random() * 8) + 16}`} 
            height="h-4" 
          />
        ) : (
          <div className="space-y-2">
            <SkeletonCell 
              width={index === 0 ? "w-full" : `w-${Math.floor(Math.random() * 4) + 3}/4`} 
              height="h-4" 
              delay={`${rowIndex * 100 + index * 50}ms`}
            />
            {Math.random() > 0.4 && (
              <SkeletonCell 
                width="w-1/2" 
                height="h-3" 
                delay={`${rowIndex * 100 + index * 50 + 200}ms`}
              />
            )}
          </div>
        )}
      </td>
    ))}
  </tr>
);

export function SkeletonTable({
  rows = 5,
  columns = 6,
  showHeader = true,
  className = ''
}: TableSkeletonProps) {
  return (
    <div className={`bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {showHeader && (
            <thead className="bg-gray-50">
              <SkeletonRow columns={columns} isHeader />
            </thead>
          )}
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, index) => (
              <SkeletonRow key={index} columns={columns} rowIndex={index} />
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SkeletonCell width="w-20" height="h-4" />
          <SkeletonCell width="w-16" height="h-4" />
        </div>
        <div className="flex items-center space-x-2">
          <SkeletonCell width="w-8" height="h-8" />
          <SkeletonCell width="w-8" height="h-8" />
          <SkeletonCell width="w-8" height="h-8" />
          <SkeletonCell width="w-8" height="h-8" />
        </div>
      </div>
    </div>
  );
}

// Page Skeleton (merged from PageSkeleton.tsx)
interface PageSkeletonProps {
  hasHeader?: boolean;
  hasFilters?: boolean;
  hasStats?: boolean;
  className?: string;
}

const HeaderSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border shadow-sm p-6 animate-pulse">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="space-y-2">
        <div className="h-6 bg-gray-200 rounded w-48"></div>
        <div className="h-4 bg-gray-200 rounded w-64"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-9 bg-gray-200 rounded w-24"></div>
        <div className="h-9 bg-gray-200 rounded w-32"></div>
      </div>
    </div>
  </div>
);

const FiltersSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border shadow-sm p-6 animate-pulse">
    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
      <div className="relative w-full md:w-80">
        <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
        <div className="h-10 bg-gray-200 rounded-lg w-28"></div>
      </div>
    </div>
  </div>
);

const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
    {Array.from({ length: 4 }).map((_, index) => (
      <SkeletonDashboardCard key={index} />
    ))}
  </div>
);

export function SkeletonPage({
  hasHeader = true,
  hasFilters = true,
  hasStats = false,
  className = ''
}: PageSkeletonProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {hasHeader && <HeaderSkeleton />}
      {hasStats && <StatsSkeleton />}
      {hasFilters && <FiltersSkeleton />}
      <SkeletonTable rows={5} columns={6} />
    </div>
  );
}

// Legacy exports for backward compatibility
export const ReviewerTableSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <SkeletonTable rows={6} columns={6} showHeader={true} className={className} />
);

export const ApproverTableSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <SkeletonTable rows={5} columns={6} showHeader={true} className={className} />
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={cn('bg-white rounded-xl border shadow-sm p-6 animate-pulse', className)}>
    <div className="space-y-2 mb-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-3 w-48" />
    </div>
    <div className="h-64 bg-gray-100 rounded"></div>
  </div>
);

export default Skeleton;
