/**
 * Reusable Error State Component
 * Can be used throughout the application for consistent error handling UI
 */

import { 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  HomeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { ReactNode } from 'react';

export type ErrorStateVariant = 'default' | 'inline' | 'compact' | 'fullscreen';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string;
  onRetry?: () => void;
  onGoHome?: () => void;
  onClose?: () => void;
  variant?: ErrorStateVariant;
  showErrorDetails?: boolean;
  retryLabel?: string;
  homeLabel?: string;
  className?: string;
  children?: ReactNode;
}

export default function ErrorState({
  title = 'Terjadi Kesalahan',
  message = 'Mohon maaf, terjadi kesalahan saat memuat data. Silakan coba lagi.',
  error,
  onRetry,
  onGoHome,
  onClose,
  variant = 'default',
  showErrorDetails = process.env.NODE_ENV === 'development',
  retryLabel = 'Coba Lagi',
  homeLabel = 'Ke Beranda',
  className = '',
  children,
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;

  // Fullscreen variant
  if (variant === 'fullscreen') {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4 ${className}`}>
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-red-100 rounded-full mb-4 animate-pulse">
                <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h2>
              <p className="text-gray-600 mb-6">{message}</p>

              {showErrorDetails && errorMessage && (
                <div className="w-full mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs font-mono text-red-800 text-left break-all">
                    {errorMessage}
                  </p>
                </div>
              )}

              {children}

              <div className="flex space-x-3 w-full">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors inline-flex items-center justify-center"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    {retryLabel}
                  </button>
                )}
                {onGoHome && (
                  <button
                    onClick={onGoHome}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors inline-flex items-center justify-center"
                  >
                    <HomeIcon className="h-4 w-4 mr-2" />
                    {homeLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900 mb-1">{title}</h3>
            <p className="text-sm text-red-700 mb-3">{message}</p>
            
            {showErrorDetails && errorMessage && (
              <div className="mb-3 p-2 bg-red-100 rounded text-xs font-mono text-red-800 break-all">
                {errorMessage}
              </div>
            )}

            {children}

            {(onRetry || onClose) && (
              <div className="flex space-x-2 mt-3">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="text-sm px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors inline-flex items-center"
                  >
                    <ArrowPathIcon className="h-3 w-3 mr-1" />
                    {retryLabel}
                  </button>
                )}
                {onClose && (
                  <button
                    onClick={onClose}
                    className="text-sm px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Tutup
                  </button>
                )}
              </div>
            )}
          </div>
          {onClose && !onRetry && (
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-600 transition-colors ml-2"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 ${className}`}>
        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900">{title}</p>
          {message && <p className="text-xs text-red-700 mt-0.5">{message}</p>}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors inline-flex items-center flex-shrink-0"
          >
            <ArrowPathIcon className="h-3 w-3 mr-1" />
            Retry
          </button>
        )}
      </div>
    );
  }

  // Default variant - centered card
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 p-8">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-red-100 rounded-full mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6 text-sm">{message}</p>

          {showErrorDetails && errorMessage && (
            <div className="w-full mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs font-mono text-red-800 text-left break-all">
                {errorMessage}
              </p>
            </div>
          )}

          {children}

          <div className="flex space-x-3 w-full">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors inline-flex items-center justify-center"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                {retryLabel}
              </button>
            )}
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors inline-flex items-center justify-center"
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                {homeLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
