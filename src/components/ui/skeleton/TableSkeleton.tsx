'use client';

import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

// Komponen skeleton untuk cell individual
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

// Komponen skeleton untuk row
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

export default function TableSkeleton({
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
      
      {/* Skeleton untuk pagination */}
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

// Skeleton khusus untuk ReviewerTable
export function ReviewerTableSkeleton({ className = '' }: { className?: string }) {
  return (
    <TableSkeleton 
      rows={6} 
      columns={6} 
      showHeader={true}
      className={className}
    />
  );
}

// Skeleton khusus untuk ApproverTable  
export function ApproverTableSkeleton({ className = '' }: { className?: string }) {
  return (
    <TableSkeleton 
      rows={5} 
      columns={6} 
      showHeader={true}
      className={className}
    />
  );
}