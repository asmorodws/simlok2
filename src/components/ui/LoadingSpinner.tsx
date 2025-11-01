'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-3'
  };

  return (
    <div
      className={`animate-spin rounded-full border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Loading Overlay untuk full page loading
interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Memuat...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center space-y-4">
        <LoadingSpinner size="xl" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
}

// Dashboard Loading Skeleton
interface DashboardLoadingSkeletonProps {
  type: 'stats' | 'table' | 'card';
  count?: number;
}

export function DashboardLoadingSkeleton({ type, count = 5 }: DashboardLoadingSkeletonProps) {
  if (type === 'stats') {
    return (
      <>
        {[...Array(count)].map((_, index) => (
          <div key={index} className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 animate-pulse rounded w-2/3 mb-2"></div>
                <div className="h-8 bg-gray-200 animate-pulse rounded w-1/2 mt-1"></div>
              </div>
              <div className="h-12 w-12 bg-gray-200 animate-pulse rounded-full"></div>
            </div>
          </div>
        ))}
      </>
    );
  }

  if (type === 'table') {
    return (
      <div className="p-6 space-y-4">
        {[...Array(count)].map((_, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <>
        {[...Array(count)].map((_, index) => (
          <div key={index} className="bg-white rounded-xl border shadow-sm p-6">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </>
    );
  }

  return null;
}
