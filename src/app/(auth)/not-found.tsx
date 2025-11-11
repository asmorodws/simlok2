/**
 * 404 Not Found Page for Auth Routes
 * Displays when an auth page is not found
 */

import Link from 'next/link';
import { Metadata } from 'next';
import { 
  ShieldExclamationIcon, 
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: '404 - Halaman Auth Tidak Ditemukan | SIMLOK',
  description: 'Halaman autentikasi yang Anda cari tidak ditemukan',
};

export default function AuthNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Icon Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full">
                <ShieldExclamationIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-white mb-2">404</h1>
            <p className="text-blue-100">Halaman Tidak Ditemukan</p>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Halaman Login/Register Tidak Tersedia
              </h2>
              <p className="text-gray-600 text-sm">
                Halaman autentikasi yang Anda cari tidak ditemukan.
              </p>
            </div>

            {/* Available Auth Pages */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
              <h3 className="text-xs font-semibold text-blue-900 mb-3 uppercase tracking-wide">
                Halaman Autentikasi Tersedia:
              </h3>
              <div className="space-y-2 text-sm">
                <Link 
                  href="/login" 
                  className="flex items-center text-blue-700 hover:text-blue-900 hover:underline"
                >
                  <ArrowRightIcon className="h-3 w-3 mr-2" />
                  Login - Masuk ke Akun
                </Link>
                <Link 
                  href="/signup" 
                  className="flex items-center text-blue-700 hover:text-blue-900 hover:underline"
                >
                  <ArrowRightIcon className="h-3 w-3 mr-2" />
                  Signup - Buat Akun Baru
                </Link>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Ke Halaman Login
              </Link>
              
              <button
                onClick={() => window.history.back()}
                className="w-full inline-flex items-center justify-center px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Kembali
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
