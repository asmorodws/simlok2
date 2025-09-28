"use client";

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import DashboardTemplate from '@/components/layout/DashboardTemplate';
import CameraQRScanner from '@/components/scanner/CameraQRScanner';
import ScanHistory from '@/components/scanner/ScanHistory';

export default function VerifierDashboard() {
  const { data: session } = useSession();
  const [scannerOpen, setScannerOpen] = useState(false);
  const scanHistoryRef = useRef<{ closeDetailModal: () => void } | null>(null);

  // Prepare stats for StatsGrid (mock data for verifier)
  const statsData = [
    {
      id: "total-scans",
      label: "Total Scan",
      value: 0, // This should come from API
      color: "blue" as const
    },
    {
      id: "today-scans", 
      label: "Scan Hari Ini", 
      value: 0, // This should come from API
      color: "green" as const
    },
    {
      id: "verified",
      label: "Terverifikasi",
      value: 0, // This should come from API
      color: "green" as const
    },
    {
      id: "invalid",
      label: "Tidak Valid",
      value: 0, // This should come from API
      color: "red" as const
    }
  ];

  const headerActions = [
    {
      label: "Mulai Scan Barcode/QR Code",
      onClick: () => {
        console.log('Opening barcode scanner from verifier dashboard');
        // Close any open detail modals from scan history
        if (scanHistoryRef.current?.closeDetailModal) {
          scanHistoryRef.current.closeDetailModal();
        }
        setScannerOpen(true);
      },
      variant: "primary" as const
    }
  ];

  // Custom section for scan history
  const customSections = [
    <div key="scan-history" className="bg-white rounded-xl border shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Riwayat Scan Barcode & QR Code
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Histori pemindaian barcode dan QR code SIMLOK
        </p>
      </div>
      <ScanHistory 
        ref={scanHistoryRef}
        className="border-0 shadow-none bg-transparent" 
      />
    </div>
  ];

  return (
    <>
      <DashboardTemplate
        title="Selamat datang di Dashboard Verifier"
        subtitle={`Selamat datang, ${session?.user?.officer_name || 'Verifier'}`}
        description="Scan barcode atau QR code SIMLOK untuk verifikasi. Scanner mendukung berbagai format: QR Code, Code 128, Code 39, EAN, UPC."
        stats={statsData}
        statsColumns={4}
        headerActions={headerActions}
        customSections={customSections}
        tables={[]} // No tables needed for verifier dashboard
      />

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
    </>
  );
}