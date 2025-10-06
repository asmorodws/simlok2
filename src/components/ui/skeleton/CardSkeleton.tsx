'use client';

import React from 'react';

interface CardSkeletonProps {
  count?: number;
  className?: string;
}

// Skeleton untuk card individual
const SkeletonCard: React.FC = () => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-3 flex-1">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

// Skeleton untuk stats cards (dashboard)
export default function CardSkeleton({ count = 4, className = '' }: CardSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

// Skeleton untuk chart section
export function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm ${className}`}>
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-40"></div>
            <div className="h-4 bg-gray-200 rounded w-60"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-24"></div>
        </div>
        
        {/* Chart area */}
        <div className="h-64 bg-gray-100 rounded-lg flex items-end justify-center space-x-2 px-4 py-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-t"
              style={{
                height: `${20 + Math.random() * 60}%`,
                width: '40px',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Skeleton untuk list items
export function ListSkeleton({ 
  rows = 5, 
  showAvatar = false,
  className = '' 
}: { 
  rows?: number;
  showAvatar?: boolean;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
        
        {/* List items */}
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 rounded-lg">
              {showAvatar && (
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              )}
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}