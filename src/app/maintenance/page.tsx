/**
 * Maintenance Mode Page
 * Can be used during system maintenance or updates
 * To activate: Set NEXT_PUBLIC_MAINTENANCE_MODE=true in .env
 */

import { Metadata } from 'next';
import { 
  WrenchScrewdriverIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Maintenance - SIMLOK',
  description: 'Sistem sedang dalam pemeliharaan',
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header with Gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12 text-center relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-20 h-20 border-4 border-white rounded-full animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-16 h-16 border-4 border-white rounded-full animate-pulse delay-75"></div>
              <div className="absolute top-1/2 right-1/4 w-12 h-12 border-4 border-white rounded-full animate-pulse delay-150"></div>
            </div>

            <div className="flex justify-center mb-6 relative">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-full">
                <WrenchScrewdriverIcon className="h-16 w-16 text-white animate-pulse" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-2 relative">
              Sistem Dalam Pemeliharaan
            </h1>
            <p className="text-blue-100 text-lg relative">We'll be back soon!</p>
          </div>

          {/* Content */}
          <div className="px-8 py-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                Mohon Maaf atas Ketidaknyamanan Ini
              </h2>
              <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                Kami sedang melakukan pemeliharaan dan peningkatan sistem untuk memberikan 
                pengalaman yang lebih baik. Sistem akan kembali online dalam waktu singkat.
              </p>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Estimated Time */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <ClockIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-blue-900">
                    Estimasi Waktu
                  </h3>
                </div>
                <p className="text-sm text-blue-800">
                  Sistem diperkirakan kembali normal dalam <strong>1-2 jam</strong>
                </p>
              </div>

              {/* Status */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <ArrowPathIcon className="h-5 w-5 text-purple-600 animate-spin" />
                  </div>
                  <h3 className="text-sm font-semibold text-purple-900">
                    Status Saat Ini
                  </h3>
                </div>
                <p className="text-sm text-purple-800">
                  <span className="inline-flex items-center">
                    <span className="h-2 w-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
                    Sedang dalam proses pemeliharaan
                  </span>
                </p>
              </div>
            </div>

            {/* What's Being Updated */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6 mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Yang Sedang Kami Tingkatkan:
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>Peningkatan performa sistem</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>Update keamanan dan bug fixes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>Penambahan fitur-fitur baru</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>Optimasi database dan caching</span>
                </li>
              </ul>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                Muat Ulang Halaman
              </button>
              <p className="text-xs text-gray-500 mt-3">
                Atau tunggu beberapa saat dan coba lagi
              </p>
            </div>
          </div>
        </div>

        {/* Footer Contact Info */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600 mb-2">
            Untuk informasi lebih lanjut atau bantuan darurat:
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm">
            <a 
              href="mailto:support@simlok.com" 
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              📧 support@simlok.com
            </a>
            <span className="hidden sm:inline text-gray-400">|</span>
            <a 
              href="tel:+6281234567890" 
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              📞 +62 812-3456-7890
            </a>
          </div>
        </div>

        {/* Progress Animation */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="bg-white rounded-full h-2 overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-progress"></div>
          </div>
        </div>
      </div>

      {/* Add animation keyframes */}
      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 30%; }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
