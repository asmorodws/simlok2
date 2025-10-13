'use client';

import React, { useState } from 'react';
import { XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import Button from '@/components/ui/button/Button';
import SimlokPdfModal from '@/components/common/SimlokPdfModal';

interface ScanResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  scanned_at?: string;
  scanned_by?: string;
  scan_id?: string;
  previousScan?: {
    scanDate: string | Date;
    scanId: string;
    scannerName: string;
  };
}

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ScanResult;
}

const ScanModal: React.FC<ScanModalProps> = ({
  isOpen,
  onClose,
  result
}) => {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  if (!isOpen) return null;

  // Debug logging
  console.log('=== SCAN MODAL DEBUG ===');
  console.log('result:', result);
  console.log('result.data:', result.data);
  console.log('result.data?.submission:', result.data?.submission);

  const submission = result.data?.submission;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 md:p-8"
      onClick={onClose}
    >
      <div 
        className="bg-white  rounded-lg  shadow-xl h-full w-full md:h-auto md:max-w-2xl md:min-w-[600px] md:max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-xl font-semibold">
              {result.success ? 'Scan Berhasil' : 'Scan Gagal'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Status Icon & Message */}
            <div className="text-center mb-6">
              {result.success ? (
                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-3" />
              ) : (
                <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-3" />
              )}
              
              <p className="text-lg font-medium mb-2">
                {result.success ? 'Barcode/QR Code Valid' : 
                 result.error === 'duplicate_scan_same_day' ? 'Sudah Discan Hari Ini' :
                 result.error === 'already_scanned_by_other' ? 'Sudah Discan Verifikator Lain' :
                 result.error === 'duplicate_scan' ? 'QR Code Sudah Pernah Discan' :
                 'Barcode/QR Code Tidak Valid'}
              </p>
              
              {result.message && (
                <p className="text-gray-600 text-sm md:text-base">{result.message}</p>
              )}
              
              {/* Show previous scan info for all duplicate error types */}
              {(result.error === 'duplicate_scan_same_day' || 
                result.error === 'already_scanned_by_other' || 
                result.error === 'duplicate_scan') && result.previousScan && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-left max-w-md mx-auto">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Informasi Scan Sebelumnya:</h4>
                  <div className="text-xs text-yellow-700 space-y-1">
                    <p><span className="font-medium">Verifikator:</span> {result.previousScan.scannerName}</p>
                    <p><span className="font-medium">Waktu:</span> {new Date(result.previousScan.scanDate).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</p>
                  </div>
                </div>
              )}
              
              {result.error && !['duplicate_scan', 'duplicate_scan_same_day', 'already_scanned_by_other'].includes(result.error) && (
                <p className="text-red-600 text-sm md:text-base">{result.error}</p>
              )}
            </div>

            {/* Submission Details */}
            {result.success && submission && (
              <div className="bg-gray-50 rounded-lg p-4 md:p-6 mb-6">
                <h3 className="font-semibold mb-4 text-lg">Detail SIMLOK</h3>
                <div className="space-y-4 md:space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Nomor SIMLOK:</span>
                      <p className="font-medium">{submission.number || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Status:</span>
                      <p className="font-medium capitalize">
                        {submission.status === 'approved' ? 'Disetujui' : 
                         submission.status === 'pending' ? 'Menunggu' : 
                         submission.status === 'rejected' ? 'Ditolak' : 
                         submission.status}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Vendor:</span>
                    <p className="font-medium">{submission.vendor?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Pekerjaan:</span>
                    <p className="font-medium">{submission.title || submission.task || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Lokasi:</span>
                    <p className="font-medium">{submission.location || '-'}</p>
                  </div>
                  {submission.workers && submission.workers.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-600">Pekerja:</span>
                      <div className="mt-1">
                        {submission.workers.map((worker: any, index: number) => (
                          <p key={index} className="font-medium text-sm">
                            • {worker.name}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {(submission.implementation_start_date || submission.implementation_end_date) && (
                    <div>
                      <span className="text-sm text-gray-600">Periode Pelaksanaan:</span>
                      <p className="font-medium">
                        {submission.implementation_start_date ? 
                          new Date(submission.implementation_start_date).toLocaleDateString('id-ID') : 
                          '-'} 
                        {submission.implementation_end_date && 
                          ` s/d ${new Date(submission.implementation_end_date).toLocaleDateString('id-ID')}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scan Information */}
            {/* {result.success && (result.scanned_at || result.scanned_by) && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3 text-blue-900">Informasi Scan</h3>
                <div className="space-y-2">
                  {result.scanned_by && (
                    <div>
                      <span className="text-sm text-blue-700">Discan oleh:</span>
                      <p className="font-medium text-blue-900">{result.scanned_by}</p>
                    </div>
                  )}
                  {result.scanned_at && (
                    <div>
                      <span className="text-sm text-blue-700">Waktu scan:</span>
                      <p className="font-medium text-blue-900">
                        {new Date(result.scanned_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  )}
                  {result.scan_id && (
                    <div>
                      <span className="text-sm text-blue-700">ID Scan:</span>
                      <p className="font-medium text-blue-900 font-mono text-sm">{result.scan_id}</p>
                    </div>
                  )}
                </div>
              </div>
            )} */}
            
            {/* Extra padding for better scrolling on mobile */}
            <div className="pb-4 md:pb-6"></div>
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="flex gap-3 shrink-0 pt-4 md:pt-6 border-t border-gray-200 md:px-2">
            {result.success && submission?.status === 'approved' && submission?.number && (
              <Button 
                onClick={() => setIsPdfModalOpen(true)}
                variant="primary"
                className="flex-1 md:py-3 md:text-base md:font-medium"
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                {submission?.approval_status === 'APPROVED' ? 'Lihat PDF' : 'Lihat Preview PDF'}
              </Button>
            )}
            <Button 
              onClick={onClose}
              variant={result.success && submission?.status === 'approved' && submission?.number ? "outline" : "primary"}
              className="flex-1 md:py-3 md:text-base md:font-medium"
            >
              {result.success ? 'Selesai' : 'Tutup'}
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Modal */}
      {result.success && submission && (
        <SimlokPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          submissionId={submission.id || ''}
          submissionName={submission.vendor?.name || ''}
          nomorSimlok={submission.number || ''}
        />
      )}
    </div>
  );
};

export default ScanModal;