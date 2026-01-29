'use client';

import React, { useState } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import BaseModal from '@/components/ui/modal/BaseModal';
import SimlokPdfModal from '@/components/features/document/SimlokPdfModal';
import type { ScanResult } from '@/types';

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

  const submission = result.data?.submission;

  const footer = (
    <div className="flex gap-3 w-full">
      {result.success && submission?.status === 'approved' && submission?.number && (
        <Button 
          onClick={() => setIsPdfModalOpen(true)}
          variant="primary"
          className="flex-1"
        >
          <DocumentTextIcon className="w-4 h-4 mr-2" />
          {submission?.approval_status === 'APPROVED' ? 'Lihat PDF' : 'Lihat Preview PDF'}
        </Button>
      )}
      <Button 
        onClick={onClose}
        variant={result.success && submission?.status === 'approved' && submission?.number ? "outline" : "primary"}
        className="flex-1"
      >
        {result.success ? 'Selesai' : 'Tutup'}
      </Button>
    </div>
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={result.success ? 'Scan Berhasil' : 'Scan Gagal'}
        footer={footer}
        size="lg"
        contentClassName="max-h-[70vh]"
      >
        <div>
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
                            <Badge variant="info">{submission.simja_type}</Badge>
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
                            <Badge variant="success">{submission.sika_type}</Badge>
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
                        <Badge variant="default">
                          {submission.worker_count || submission.workers.length} Orang
                        </Badge>
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
        </BaseModal>

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
      </>
  );
};

export default ScanModal;