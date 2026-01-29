'use client';

import React from 'react';
import {
  QrCodeIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import DetailSection from '@/components/features/dashboard/DetailSection';
import { Badge } from '@/components/ui/badge/Badge';
import type { QrScan } from '@/types';

interface ScanHistory {
  scans: QrScan[];
  totalScans: number;
  lastScan?: QrScan;
  hasBeenScanned: boolean;
}

interface ScanHistoryTabProps {
  scanHistory: ScanHistory | null;
  loading: boolean;
}

export default function ScanHistoryTab({
  scanHistory,
  loading,
}: ScanHistoryTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!scanHistory || scanHistory.scans.length === 0) {
    return (
      <div className="text-center py-12">
        <QrCodeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Belum Ada Riwayat Scan</h3>
        <p className="mt-1 text-sm text-gray-500">
          SIMLOK ini belum pernah discan oleh verifier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <DetailSection title="Ringkasan Scan" icon={<QrCodeIcon className="h-5 w-5" />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Total Scan</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{scanHistory.totalScans}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">Status</div>
            <div className="mt-1">
              <Badge variant={scanHistory.hasBeenScanned ? 'success' : 'default'}>
                {scanHistory.hasBeenScanned ? 'Sudah Discan' : 'Belum Discan'}
              </Badge>
            </div>
          </div>
          {scanHistory.lastScan && (
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Scan Terakhir</div>
              <div className="text-sm text-purple-900 mt-1">
                {new Date(scanHistory.lastScan.scanned_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          )}
        </div>
      </DetailSection>

      {/* Scan History List */}
      <DetailSection title="Riwayat Scan" icon={<ClockIcon className="h-5 w-5" />}>
        <div className="space-y-3">
          {scanHistory.scans.map((scan, index) => (
            <div
              key={scan.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      Scan #{scanHistory.scans.length - index}
                    </span>
                    {index === 0 && (
                      <Badge variant="info" className="ml-2">Terbaru</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start">
                      <ClockIcon className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <div className="text-gray-500">Waktu Scan</div>
                        <div className="text-gray-900 font-medium">
                          {new Date(scan.scanned_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    {scan.scanner_name && (
                      <div className="flex items-start">
                        <UserIcon className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <div className="text-gray-500">Discan Oleh</div>
                          <div className="text-gray-900 font-medium">{scan.scanner_name}</div>
                        </div>
                      </div>
                    )}

                    {scan.scan_location && (
                      <div className="flex items-start sm:col-span-2">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <div className="text-gray-500">Lokasi</div>
                          <div className="text-gray-900">{scan.scan_location}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DetailSection>
    </div>
  );
}
