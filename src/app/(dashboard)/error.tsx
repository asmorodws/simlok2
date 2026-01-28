/**
 * Shared Error Boundary for Dashboard Routes
 * Digunakan di semua role-based routes untuk konsistensi UI
 */

'use client';

import { useEffect } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error dengan context untuk debugging
    console.error('Dashboard Error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
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
            Maaf, terjadi kesalahan saat memuat halaman. 
            Silakan coba lagi atau hubungi administrator jika masalah berlanjut.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="w-full mb-4 p-4 bg-gray-50 rounded-lg text-left">
              <p className="text-xs font-mono text-gray-700 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-gray-500 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 w-full">
            <button
              onClick={reset}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Coba Lagi
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Ke Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
