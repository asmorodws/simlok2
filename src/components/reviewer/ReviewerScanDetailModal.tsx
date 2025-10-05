// src/components/reviewer/ReviewerScanDetailModal.tsx
'use client';

import React from 'react';
import Button from '@/components/ui/button/Button';
import { id as localeID } from 'date-fns/locale';
import { format } from 'date-fns';
import type { QrScan } from '@/components/scanner/ScanHistoryTable';

interface Props {
  open: boolean;
  onClose: () => void;
  scan: QrScan | null;
  /** opsional: untuk buka PDF SIMLOK dari reviewer */
  onOpenPdf?: (scan: QrScan) => void;
}

export default function ReviewerScanDetailModal({ open, onClose, scan, onOpenPdf }: Props) {
  if (!open || !scan) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Informasi Detail Scan</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-6 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section>
              <h4 className="font-semibold text-gray-700 mb-2">Informasi Pengajuan</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nomor Simlok:</span>
                  <span className="font-medium">{scan.submission.simlok_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Perusahaan:</span>
                  <span className="font-medium">{scan.submission.vendor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Deskripsi Pekerjaan:</span>
                  <span className="font-medium">{scan.submission.job_description}</span>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-gray-700 mb-2">Informasi Verifikator</h4>
              <div className="space-y-1">
                {scan.scanner_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Scanner Name:</span>
                    <span className="font-medium">{scan.scanner_name}</span>
                  </div>
                )}
                {scan.scan_location && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lokasi Scan:</span>
                    <span className="font-medium">{scan.scan_location}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium">{scan.user.email}</span>
                </div>
              </div>
            </section>
          </div>

          <section>
            <h4 className="font-semibold text-gray-700 mb-2">Detail Waktu</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Waktu Scan:</span>
                <span className="font-medium">
                  {format(new Date(scan.scanned_at), 'dd/MM/yyyy HH:mm:ss', { locale: localeID })}
                </span>
              </div>
            </div>
          </section>

          {/* {scan.notes && (
            <section>
              <h4 className="font-semibold text-gray-700 mb-2">Catatan</h4>
              <p className="text-gray-800">{scan.notes}</p>
            </section>
          )} */}

          <div className="pt-4 border-t flex justify-between items-center gap-2">
            {onOpenPdf && (
              <Button onClick={() => onOpenPdf(scan)} className="bg-blue-600 hover:bg-blue-700 text-white">
                Lihat PDF SIMLOK
              </Button>
            )}
            <Button onClick={onClose} variant="destructive">Tutup</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
