/**
 * Root Error Boundary
 * Catches errors at the root app level
 */

'use client';

import { useEffect } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development or to error tracking service in production
    console.error('Root Level Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
      <div className="max-w-2xl w-full">
        {/* Main Error Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 overflow-hidden">
          {/* Error Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-full animate-pulse">
                <ExclamationTriangleIcon className="h-16 w-16 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Terjadi Kesalahan</h1>
            <p className="text-red-100 text-lg">Mohon maaf atas ketidaknyamanan ini</p>
          </div>

          {/* Error Content */}
          <div className="px-8 py-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                Ups! Ada yang tidak beres
              </h2>
              <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                Aplikasi mengalami masalah saat memproses permintaan Anda. 
                Tim kami telah menerima pemberitahuan dan sedang menangani masalah ini.
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && error.message && (
              <div className="mb-8">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-red-900 mb-3">
                    Error Details (Development):
                  </h3>
                  <div className="bg-white rounded-lg p-4 border border-red-100">
                    <p className="text-xs font-mono text-red-800 break-all whitespace-pre-wrap">
                      {error.message}
                    </p>
                    {error.digest && (
                      <p className="text-xs text-red-600 mt-2">
                        Error ID: {error.digest}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* What You Can Do */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">
                Yang Dapat Anda Lakukan:
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Coba muat ulang halaman dengan tombol di bawah</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Kembali ke halaman beranda dan coba lagi</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Bersihkan cache browser Anda</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Hubungi administrator jika masalah berlanjut</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                Muat Ulang Halaman
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
              >
                <HomeIcon className="h-5 w-5 mr-2" />
                Ke Beranda
              </button>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>
            Jika Anda terus mengalami masalah, silakan hubungi{' '}
            <a href="mailto:support@simlok.com" className="text-blue-600 hover:underline">
              support@simlok.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
