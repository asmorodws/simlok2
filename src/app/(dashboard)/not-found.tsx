/**
 * 404 Not Found Page for Dashboard Routes
 * Displays when a dashboard page is not found
 */

import Link from 'next/link';
import { Metadata } from 'next';
import { 
  FolderOpenIcon, 
  ArrowLeftIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: '404 - Halaman Dashboard Tidak Ditemukan | SIMLOK',
  description: 'Halaman dashboard yang Anda cari tidak ditemukan',
};

export default function DashboardNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-xl w-full">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Icon Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-10 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full">
                <FolderOpenIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-white mb-2">404</h1>
            <p className="text-purple-100">Halaman Dashboard Tidak Ditemukan</p>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Halaman Tidak Tersedia
              </h2>
              <p className="text-gray-600 text-sm">
                Halaman dashboard yang Anda cari tidak ditemukan atau Anda tidak memiliki akses.
              </p>
            </div>

            {/* Quick Links */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 mb-6">
              <h3 className="text-xs font-semibold text-purple-900 mb-3 uppercase tracking-wide">
                Halaman Dashboard Tersedia:
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Link 
                  href="/dashboard" 
                  className="text-purple-700 hover:text-purple-900 hover:underline"
                >
                  → Dashboard Utama
                </Link>
                <Link 
                  href="/vendor" 
                  className="text-purple-700 hover:text-purple-900 hover:underline"
                >
                  → Vendor Panel
                </Link>
                <Link 
                  href="/verifier" 
                  className="text-purple-700 hover:text-purple-900 hover:underline"
                >
                  → Verifier Panel
                </Link>
                <Link 
                  href="/super-admin" 
                  className="text-purple-700 hover:text-purple-900 hover:underline"
                >
                  → Super Admin
                </Link>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.history.back()}
                className="flex-1 inline-flex items-center justify-center px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Kembali
              </button>
              
              <Link
                href="/dashboard"
                className="flex-1 inline-flex items-center justify-center px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
              >
                <Squares2X2Icon className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
