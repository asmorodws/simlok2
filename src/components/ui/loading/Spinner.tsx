/**
 * Unified Spinner Component
 * Merged from LoadingSpinner.tsx + PageLoader.tsx
 * Provides loading indicators for various scenarios
 */

'use client';

import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fullScreen?: boolean;
  message?: string;
}

/**
 * Main Spinner component
 * Can be used inline or as full-screen overlay
 */
export default function Spinner({ 
  size = 'md', 
  className = '',
  fullScreen = false,
  message
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-3'
  };

  const spinner = (
    <div
      className={`animate-spin rounded-full border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );

  // Full screen mode
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
            <div className="absolute inset-0 h-16 w-16 animate-pulse rounded-full border-4 border-transparent border-t-blue-400 opacity-50"></div>
          </div>
          {message && (
            <div className="flex flex-col items-center space-y-2">
              <p className="text-sm font-medium text-gray-700">{message}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inline spinner with optional message
  if (message) {
    return (
      <div className="flex flex-col items-center space-y-2">
        {spinner}
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    );
  }

  return spinner;
}

/**
 * Loading Overlay (legacy from LoadingSpinner)
 * Backward compatibility
 */
export function LoadingOverlay({ message = 'Memuat...' }: { message?: string }) {
  return <Spinner fullScreen message={message} />;
}

/**
 * Page Loader (legacy from PageLoader)
 * Backward compatibility
 */
export function PageLoader({ message = 'Loading...', fullScreen = true }: SpinnerProps) {
  return <Spinner fullScreen={fullScreen} message={message} size="xl" />;
}

/**
 * Dashboard Loading Skeleton (legacy)
 * Backward compatibility - redirects to SkeletonDashboardCard
 * Import from Skeleton.tsx instead
 */
interface DashboardLoadingSkeletonProps {
  type: 'stats' | 'table' | 'card';
  count?: number;
}

export function DashboardLoadingSkeleton({ type, count = 5 }: DashboardLoadingSkeletonProps) {
  if (type === 'stats') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border shadow-sm animate-pulse">
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
  }

  if (type === 'table') {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden animate-pulse">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Array.from({ length: 5 }).map((_, i) => (
                  <th key={i} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: count }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // card type
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}
