'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { CameraIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui';
import CameraQRScanner from '../scanner/CameraQRScanner';
import ScanHistory from '../scanner/ScanHistory';

export default function VerifierDashboard() {
  const { data: session } = useSession();
  const [scannerOpen, setScannerOpen] = useState(false);
  const scanHistoryRef = useRef<{ closeDetailModal: () => void } | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Dashboard Verifier
                </h1>
                <p className="mt-2 text-gray-600">
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
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Barcode & QR Code Scanner
              </h2>
              <p className="text-gray-600 mb-6">
                Scan barcode atau QR code SIMLOK untuk verifikasi. Scanner mendukung berbagai format: QR Code, Code 128, Code 39, EAN, UPC. Pastikan browser mengizinkan akses kamera.
              </p>
              
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => {
                    console.log('Opening barcode scanner from verifier dashboard');
                    // Close any open detail modals from scan history
                    if (scanHistoryRef.current?.closeDetailModal) {
                      scanHistoryRef.current.closeDetailModal();
                    }
                    setScannerOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <CameraIcon className="w-6 h-6 mr-2" />
                  Mulai Scan Barcode/QR Code
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Scan History */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Riwayat Scan Barcode & QR Code
            </h3>
          </div>
          <ScanHistory 
            ref={scanHistoryRef}
            className="border-0 shadow-none bg-transparent" 
          />
        </div>
      </div>

      {/* Barcode & QR Code Scanner Modal */}
      <CameraQRScanner
        isOpen={scannerOpen}
        onClose={() => {
          console.log('Closing barcode scanner from verifier dashboard');
          setScannerOpen(false);
        }}
        onScan={(result: string) => {
          console.log('Barcode/QR Scanned in verifier:', result);
          // Scanner will handle the verification automatically
          // Just close the scanner after successful scan
          setScannerOpen(false);
        }}
        title="Scan Barcode/QR Code SIMLOK"
        description="Arahkan kamera ke barcode atau QR code SIMLOK untuk memverifikasi"
      />
    </div>
  );
}