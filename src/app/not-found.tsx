/**
 * Root 404 Not Found Page
 * Displays when a page is not found at the root level
 */

import Link from 'next/link';
import { Metadata } from 'next';
import { 
  MagnifyingGlassIcon, 
  HomeIcon, 
  ArrowLeftIcon 
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: '404 - Halaman Tidak Ditemukan | SIMLOK',
  description: 'Halaman yang Anda cari tidak ditemukan',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header with Gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-full">
                <MagnifyingGlassIcon className="h-16 w-16 text-white" />
              </div>
            </div>
            <h1 className="text-6xl font-bold text-white mb-2">404</h1>
            <p className="text-blue-100 text-lg">Halaman Tidak Ditemukan</p>
          </div>

          {/* Content */}
          <div className="px-8 py-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                Ups! Halaman Tidak Ditemukan
              </h2>
              <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                Maaf, halaman yang Anda cari tidak dapat ditemukan. Halaman mungkin telah dipindahkan, 
                dihapus, atau URL yang Anda masukkan salah.
              </p>
            </div>

            {/* Suggestions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">
                Saran untuk Anda:
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Periksa kembali URL yang Anda masukkan</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Kembali ke halaman sebelumnya</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Kunjungi halaman beranda atau dashboard</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Kembali
              </button>
              
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
              >
                <HomeIcon className="h-5 w-5 mr-2" />
                Ke Beranda
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>Jika masalah berlanjut, silakan hubungi administrator sistem.</p>
        </div>
      </div>
    </div>
  );
}
