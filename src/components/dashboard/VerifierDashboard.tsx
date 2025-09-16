'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { CameraIcon } from '@heroicons/react/24/outline';
import Button from '../ui/button/Button';
import SecureQrScanner from '../scanner/SecureQrScanner';
import ScanHistory from '../scanner/ScanHistory';

export default function VerifierDashboard() {
  const { data: session } = useSession();
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Dashboard Verifier
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Selamat datang, {session?.user?.officer_name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Scan Actions */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                QR Code Scanner
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Scan QR code SIMLOK untuk verifikasi
              </p>
              
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => setScannerOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <CameraIcon className="w-6 h-6 mr-2" />
                  Mulai Scan QR Code
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Scan History */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Riwayat Scan QR Code
            </h3>
          </div>
          <ScanHistory className="border-0 shadow-none bg-transparent" />
        </div>
      </div>

      {/* QR Code Scanner Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setScannerOpen(false)}
            />
            
            <div className="relative w-full max-w-sm sm:max-w-2xl lg:max-w-4xl mx-auto">
              <SecureQrScanner
                autoStart={true}
                onClose={() => setScannerOpen(false)}
                onScanSuccess={(result) => {
                  void result; // Unused - modal system handles display
                  // Scanner will handle modal display automatically
                }}
                onScanError={(error) => {
                  void error; // Unused - error modal system handles display
                  // Scanner will handle error modal display automatically
                }}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}