/**
 * PageLoader Component
 * Full-page loading animation with spinner
 * Consistent loading UI across the application
 */

import React from 'react';

interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ 
  message = 'Loading...', 
  fullScreen = true 
}) => {
  const containerClass = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center space-y-4">
        {/* Spinner */}
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <div className="absolute inset-0 h-16 w-16 animate-pulse rounded-full border-4 border-transparent border-t-blue-400 opacity-50"></div>
        </div>
        
        {/* Message */}
        <div className="flex flex-col items-center space-y-2">
          <p className="text-sm font-medium text-gray-700">{message}</p>
          <div className="flex space-x-1">
            <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
