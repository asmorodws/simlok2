/**
 * Enhanced Mobile-First Verifier Dashboard
 * Optimized for mobile user experience with touch-friendly interfaces
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  CameraIcon, 
  QrCodeIcon, 
  DocumentTextIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BellIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/button/Button';
import CameraQRScanner from '../scanner/CameraQRScanner';
import ScanHistory from '../scanner/ScanHistory';

interface DashboardStats {
  todayScans: number;
  totalVerified: number;
  pendingReviews: number;
  recentActivity: Array<{
    id: string;
    type: 'scan' | 'verify' | 'alert';
    message: string;
    timestamp: string;
  }>;
}

export default function EnhancedVerifierDashboard() {
  const { data: session } = useSession();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    todayScans: 0,
    totalVerified: 0,
    pendingReviews: 0,
    recentActivity: []
  });
  const [greeting, setGreeting] = useState('');
  const scanHistoryRef = useRef<{ closeDetailModal: () => void } | null>(null);

  useEffect(() => {
    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Selamat pagi');
    else if (hour < 17) setGreeting('Selamat siang');
    else setGreeting('Selamat malam');

    // Fetch dashboard stats
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/verifier/dashboard-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const handleQuickScan = () => {
    if (scanHistoryRef.current?.closeDetailModal) {
      scanHistoryRef.current.closeDetailModal();
    }
    setScannerOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <QrCodeIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-white">
                  SIMLOK Verifier
                </h1>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white hover:text-blue-200 p-2"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-white text-sm">
                {session?.user?.officer_name}
              </div>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-blue-700 border-t border-blue-600">
              <div className="px-4 py-3 space-y-2">
                <div className="text-white font-medium">
                  {session?.user?.officer_name}
                </div>
                <div className="text-blue-200 text-sm">
                  Verifier SIMLOK
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Greeting & Quick Stats */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {greeting}! 👋
          </h2>
          <p className="text-gray-600">
            Siap memverifikasi dokumen SIMLOK hari ini?
          </p>
        </div>

        {/* Quick Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <QrCodeIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.todayScans}
                </div>
                <div className="text-xs text-gray-500">Scan Hari Ini</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalVerified}
                </div>
                <div className="text-xs text-gray-500">Terverifikasi</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.pendingReviews}
                </div>
                <div className="text-xs text-gray-500">Menunggu</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {new Date().toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                <div className="text-xs text-gray-500">Waktu Sekarang</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Action - Mobile First */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CameraIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                Scan QR/Barcode
              </h3>
              <p className="text-blue-100 mb-6 text-sm">
                Scan dokumen SIMLOK untuk verifikasi cepat dan akurat
              </p>
              
              <Button
                onClick={handleQuickScan}
                className="bg-white text-blue-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-xl shadow-md w-full sm:w-auto"
                size="lg"
              >
                <CameraIcon className="w-5 h-5 mr-2" />
                Mulai Scan
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid - Mobile Optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => window.location.href = '/verifier/submissions'}
            className="bg-white p-4 rounded-xl shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <DocumentTextIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-sm font-medium text-gray-900">Daftar SIMLOK</div>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/verifier/history'}
            className="bg-white p-4 rounded-xl shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <ClockIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-sm font-medium text-gray-900">Riwayat Scan</div>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/api/verifier/export'}
            className="bg-white p-4 rounded-xl shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <DocumentTextIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="text-sm font-medium text-gray-900">Export Data</div>
            </div>
          </button>

          <button
            onClick={handleQuickScan}
            className="bg-white p-4 rounded-xl shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <QrCodeIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-sm font-medium text-gray-900">Quick Scan</div>
            </div>
          </button>
        </div>

        {/* Recent Activity - Mobile Friendly */}
        {stats.recentActivity.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center">
                <BellIcon className="w-5 h-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Aktivitas Terbaru
                </h3>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {stats.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'scan' ? 'bg-blue-500' :
                    activity.type === 'verify' ? 'bg-green-500' : 'bg-orange-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scan History - Embedded */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Riwayat Scan Terakhir
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              5 scan terbaru Anda
            </p>
          </div>
          <ScanHistory 
            ref={scanHistoryRef}
            className="border-0 shadow-none bg-transparent"
          />
        </div>
      </div>

      {/* Enhanced QR Code Scanner */}
      <CameraQRScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(result: string) => {
          console.log('Barcode/QR Scanned in enhanced verifier:', result);
          setScannerOpen(false);
          // Refresh stats after successful scan
          fetchDashboardStats();
        }}
        title="Scan QR/Barcode SIMLOK"
        description="Posisikan kamera pada QR code atau barcode untuk memverifikasi dokumen SIMLOK"
      />
    </div>
  );
}