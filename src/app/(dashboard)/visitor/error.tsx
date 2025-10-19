/**
 * Error page for Next.js App Router
 * Displays when an error occurs in a route
 */

'use client';

import { useEffect } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Page Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-lg p-8">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-red-100 rounded-full mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Terjadi Kesalahan
          </h2>
          
          <p className="text-gray-600 mb-6">
            Mohon maaf atas ketidaknyamanannya. Terjadi kesalahan saat memuat halaman ini.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="w-full mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs font-mono text-red-800 text-left break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={reset}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Coba Lagi
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Ke Beranda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
