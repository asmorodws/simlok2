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
                  {/* Basic Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Nomor SIMLOK:</span>
                      <p className="font-medium">{submission.simlok_number || submission.number || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Tanggal disetujui:</span>
                      <p className="font-medium">
                        {submission.simlok_date ? 
                          new Date(submission.simlok_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          }) : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Vendor Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Vendor:</span>
                      <p className="font-medium">{submission.vendor_name || submission.vendor?.name || '-'}</p>
                    </div>
                    {submission.vendor_phone && (
                      <div>
                        <span className="text-sm text-gray-600">Telepon Vendor:</span>
                        <p className="font-medium">{submission.vendor_phone}</p>
                      </div>
                    )}
                  </div>

                  {/* Job Description */}
                  <div>
                    <span className="text-sm text-gray-600">Pekerjaan:</span>
                    <p className="font-medium">{submission.job_description || submission.title || submission.task || '-'}</p>
                  </div>

                  {/* Location */}
                  <div>
                    <span className="text-sm text-gray-600">Lokasi Pekerjaan:</span>
                    <p className="font-medium">{submission.work_location || submission.location || '-'}</p>
                  </div>

                  {/* Implementation Period */}
                  {(submission.implementation_start_date || submission.implementation_end_date) && (
                    <div>
                      <span className="text-sm text-gray-600">Periode Pelaksanaan:</span>
                      <p className="font-medium">
                        {submission.implementation_start_date ? 
                          new Date(submission.implementation_start_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          }) : '-'} 
                        {submission.implementation_end_date && 
                          ` s/d ${new Date(submission.implementation_end_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}`}
                      </p>
                    </div>
                  )}

                  {/* Working Hours */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {submission.working_hours && (
                      <div>
                        <span className="text-sm text-gray-600">Jam Kerja (Hari Biasa):</span>
                        <p className="font-medium">{submission.working_hours}</p>
                      </div>
                    )}
                    {submission.holiday_working_hours && (
                      <div>
                        <span className="text-sm text-gray-600">Jam Kerja (Hari Libur):</span>
                        <p className="font-medium">{submission.holiday_working_hours}</p>
                      </div>
                    )}
                  </div>

                  {/* Work Facilities */}
                  {submission.work_facilities && (
                    <div>
                      <span className="text-sm text-gray-600">Sarana Kerja:</span>
                      <p className="font-medium whitespace-pre-line">{submission.work_facilities}</p>
                    </div>
                  )}

               

                  {/* Documents Info */}
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600 font-semibold">Dokumen Pendukung:</span>
                    <div className="mt-2 space-y-2">
                      {/* SIMJA */}
                      {submission.simja_number && (
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">SIMJA</p>
                            <p className="text-xs text-gray-600">
                              {submission.simja_number}
                              {submission.simja_date && 
                                ` - ${new Date(submission.simja_date).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}`}
                            </p>
                          </div>
                          {submission.simja_type && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {submission.simja_type}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* SIKA */}
                      {submission.sika_number && (
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">SIKA</p>
                            <p className="text-xs text-gray-600">
                              {submission.sika_number}
                              {submission.sika_date && 
                                ` - ${new Date(submission.sika_date).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}`}
                            </p>
                          </div>
                          {submission.sika_type && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              {submission.sika_type}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* HSSE Pass */}
                      {submission.hsse_pass_number && (
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">HSSE Pass</p>
                            <p className="text-xs text-gray-600">
                              {submission.hsse_pass_number}
                              {submission.hsse_pass_valid_thru && 
                                ` - Berlaku s/d ${new Date(submission.hsse_pass_valid_thru).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Workers */}
                  {submission.workers && submission.workers.length > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600 font-semibold">Daftar Pekerja:</span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          {submission.worker_count || submission.workers.length} Orang
                        </span>
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {submission.workers.map((worker: any, index: number) => (
                          <p key={index} className="font-medium text-sm py-1">
                            {index + 1}. {worker.worker_name || worker.name}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600">Status Pengajuan:</span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        submission.approval_status === 'APPROVED' || submission.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : submission.approval_status === 'PENDING_APPROVAL' || submission.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {submission.approval_status === 'APPROVED' || submission.status === 'approved' ? '✓ Disetujui' : 
                         submission.approval_status === 'PENDING_APPROVAL' || submission.status === 'pending' ? '⏳ Menunggu Persetujuan' : 
                         '✗ Ditolak'}
                      </span>
                    </div>
                  </div>
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