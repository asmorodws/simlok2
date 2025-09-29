'use client';

import LoadingSpinner from './LoadingSpinner';

interface PageLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
}

export default function PageLoader({ 
  message = "Memuat...", 
  size = 'lg',
  fullScreen = true,
  className = ''
}: PageLoaderProps) {
  const containerClass = fullScreen 
    ? "min-h-screen bg-gray-50 flex items-center justify-center"
    : "flex items-center justify-center py-12";

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="text-center">
        <LoadingSpinner size={size} />
        <p className="text-gray-600 mt-3 text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}