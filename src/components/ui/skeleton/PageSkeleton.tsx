'use client';

import React from 'react';

interface PageSkeletonProps {
  hasHeader?: boolean;
  hasFilters?: boolean;
  hasStats?: boolean;
  className?: string;
}

// Skeleton untuk header page
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

// Skeleton untuk filters
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

// Skeleton untuk stats cards
const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="bg-white p-6 rounded-xl border shadow-sm animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    ))}
  </div>
);

export default function PageSkeleton({
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
      
      {/* Main content skeleton (table) */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden animate-pulse">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-40"></div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {Array.from({ length: 6 }).map((_, i) => (
                  <th key={i} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        {Math.random() > 0.5 && (
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination skeleton */}
        <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="flex items-center space-x-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-8 h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}