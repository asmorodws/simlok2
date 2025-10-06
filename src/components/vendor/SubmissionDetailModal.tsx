'use client';

import { useEffect, useState } from 'react';
import { 
  XMarkIcon, 
  EyeIcon, 
  DocumentIcon, 
  BuildingOfficeIcon,
  UserIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as PendingIcon
} from '@heroicons/react/24/outline';
import { fileUrlHelper } from '@/lib/fileUrlHelper';
import DocumentPreviewModal from '@/components/common/DocumentPreviewModal';
import SimlokPdfModal from '@/components/common/SimlokPdfModal';
import WorkersList from '@/components/common/WorkersList';
import DetailSection from '@/components/common/DetailSection';
import InfoCard from '@/components/common/InfoCard';
import Button from '@/components/ui/button/Button';

interface Submission {
  id: string;
  approval_status: string;
  review_status?: string;
  note_for_approver?: string | null;
  note_for_vendor?: string | null;
  reviewed_at?: string | null;
  approved_at?: string | null;
  vendor_name: string;
  based_on: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation: string | null;
  working_hours: string;
  other_notes?: string;
  work_facilities: string;
  simja_number?: string;
  simja_date?: string | null;
  sika_number?: string;
  sika_date?: string | null;
  simlok_number?: string;
  simlok_date?: string | null;
  worker_names: string;
  content?: string | null;
  notes?: string | null;
  sika_document_upload?: string;
  simja_document_upload?: string;
  qrcode?: string;
  created_at: string;
  signer_position?: string;
  signer_name?: string;
  user: {
    id: string;
    officer_name: string;
    email: string;
    vendor_name: string;
  };
  approved_by_user?: {
    id: string;
    officer_name: string;
    email: string;
  } | null;
}

interface SubmissionDetailModalProps {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SubmissionDetailModal({
  submission,
  isOpen,
  onClose
}: SubmissionDetailModalProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !submission) return null;

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Mapping status internal ke label bahasa Indonesia
  const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Menunggu',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
    PENDING_APPROVAL: 'Menunggu Review',
    // Tambahkan status lain kalau ada
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

    const label = STATUS_LABELS[status] ?? status;

    switch (status) {
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            {label}
          </span>
        );
      case 'APPROVED':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            {label}
          </span>
        );
      case 'REJECTED':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            {label}
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            {label}
          </span>
        );
    }
  };

  const handleFileView = (url: string, title: string) => {
    setSelectedDocument({ url: fileUrlHelper.convertLegacyUrl(url), title });
    setIsDocumentModalOpen(true);
  };

  const handleDownloadPdf = () => {
    setIsPdfModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-6 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Detail Pengajuan SIMLOK</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Dibuat pada {formatDate(submission.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusBadge(submission.approval_status)}
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-8">
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-sm font-medium text-yellow-800 hover:text-yellow-900"
                  >
                    {showDebug ? 'Sembunyikan' : 'Tampilkan'} Info Debug
                  </button>
                  {showDebug && (
                    <div className="mt-3">
                      <h4 className="font-bold mb-2">Info Debug:</h4>
                      <pre className="text-xs bg-yellow-50 p-3 rounded border overflow-auto max-h-40">
                        {JSON.stringify({
                          id: submission.id,
                          vendor_name: submission.vendor_name,
                          officer_name: submission.officer_name,
                          user: submission.user,
                          based_on: submission.based_on,
                          job_description: submission.job_description,
                          work_location: submission.work_location,
                          implementation: submission.implementation,
                          working_hours: submission.working_hours,
                          work_facilities: submission.work_facilities,
                          other_notes: submission.other_notes,
                          content: submission.content
                        }, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <DetailSection 
                title="Informasi Vendor" 
                icon={<BuildingOfficeIcon className="h-5 w-5 text-blue-500" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoCard
                    label="Nama Vendor"
                    value={submission.vendor_name || '-'}
                  />
                  <InfoCard
                    label="Nama Petugas"
                    value={submission.officer_name || '-'}
                    icon={<UserIcon className="h-4 w-4 text-gray-500" />}
                  />
                  <InfoCard
                    label="Alamat Email"
                    value={submission.user?.email || '-'}
                  />
                  <InfoCard
                    label="Berdasarkan"
                    value={submission.based_on || '-'}
                  />
                </div>
              </DetailSection>

              <DetailSection 
                title="Informasi Dokumen" 
                icon={<DocumentIcon className="h-5 w-5 text-orange-500" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {submission.simja_number && (
                    <InfoCard
                      label="Nomor SIMJA"
                      value={submission.simja_number}
                    />
                  )}
                  {submission.simja_date && (
                    <InfoCard
                      label="Tanggal SIMJA"
                      value={formatDate(submission.simja_date)}
                      icon={<CalendarIcon className="h-4 w-4 text-gray-500" />}
                    />
                  )}
                  {submission.sika_number && (
                    <InfoCard
                      label="Nomor SIKA"
                      value={submission.sika_number}
                    />
                  )}
                  {submission.sika_date && (
                    <InfoCard
                      label="Tanggal SIKA"
                      value={formatDate(submission.sika_date)}
                      icon={<CalendarIcon className="h-4 w-4 text-gray-500" />}
                    />
                  )}
                  {submission.approval_status === 'APPROVED' && submission.simlok_number && (
                    <InfoCard
                      label="Nomor SIMLOK"
                      value={submission.simlok_number}
                    />
                  )}
                  {submission.approval_status === 'APPROVED' && submission.simlok_date && (
                    <InfoCard
                      label="Tanggal SIMLOK"
                      value={formatDate(submission.simlok_date)}
                      icon={<CalendarIcon className="h-4 w-4 text-gray-500" />}
                    />
                  )}
                </div>
                <div className="grid grid-cols-1 mt-5 md:grid-cols-2 gap-4">
                  {submission.sika_document_upload && (
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <DocumentIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Dokumen SIKA</p>
                          <p className="text-sm text-gray-500">File tersedia</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFileView(submission.sika_document_upload!, 'Dokumen SIKA')}
                        className="flex items-center space-x-2"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>Lihat</span>
                      </Button>
                    </div>
                  )}
                  
                  {submission.simja_document_upload && (
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <DocumentIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">Dokumen SIMJA</p>
                          <p className="text-sm text-gray-500">File tersedia</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFileView(submission.simja_document_upload!, 'Dokumen SIMJA')}
                        className="flex items-center space-x-2"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>Lihat</span>
                      </Button>
                    </div>
                  )}
                  
                  {!submission.sika_document_upload && !submission.simja_document_upload && (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p>Belum ada dokumen yang diupload</p>
                    </div>
                  )}
                </div>
              </DetailSection>

              <DetailSection 
                title="Informasi Pekerjaan" 
                icon={<BriefcaseIcon className="h-5 w-5 text-green-500" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoCard
                    label="Pekerjaan"
                    value={submission.job_description || '-'}
                  />
                  <InfoCard
                    label="Lokasi Kerja"
                    value={submission.work_location || '-'}
                  />
                  <InfoCard
                    label="Pelaksanaan"
                    value={submission.implementation || 'Akan diisi oleh admin saat disetujui'}
                  />
                  <InfoCard
                    label="Jam Kerja"
                    value={submission.working_hours || '-'}
                  />
                  <InfoCard
                    label="Sarana Kerja"
                    value={submission.work_facilities || '-'}
                    className="md:col-span-2"
                  />
                </div>
              </DetailSection>

              <DetailSection 
                title="Daftar Pekerja" 
                icon={<UserIcon className="h-5 w-5 text-purple-500" />}
              >
                {submission.worker_names ? (
                  <WorkersList
                    submissionId={submission.id}
                    fallbackWorkers={submission.worker_names}
                    layout="grid"
                    showPhotos={true}
                    maxDisplayCount={6}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p>Belum ada data pekerja</p>
                  </div>
                )}
              </DetailSection>

              <DetailSection 
                title="Status Pengajuan" 
                icon={
                  submission.approval_status === 'APPROVED' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : submission.approval_status === 'REJECTED' ? (
                    <XCircleIcon className="h-5 w-5 text-red-500" />
                  ) : (
                    <PendingIcon className="h-5 w-5 text-orange-500" />
                  )
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {submission.note_for_approver && (
                    <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <DocumentIcon className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-blue-800 mb-2">Catatan</h4>
                          <p className="text-sm text-blue-700 whitespace-pre-line">
                            {submission.note_for_vendor}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {submission.approval_status === 'PENDING_APPROVAL' && (
                    <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <PendingIcon className="h-5 w-5 text-yellow-500 mr-3" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800">Menunggu Review</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            Pengajuan Anda sedang dalam proses review oleh admin.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {submission.approval_status === 'APPROVED' && (
                    <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                        <div>
                          <h4 className="text-sm font-medium text-green-800">Pengajuan Disetujui</h4>
                          <p className="text-sm text-green-700 mt-1">
                            Selamat! Pengajuan SIMLOK Anda telah disetujui.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {submission.approval_status === 'REJECTED' && (
                    <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <XCircleIcon className="h-5 w-5 text-red-500 mr-3" />
                        <div>
                          <h4 className="text-sm font-medium text-red-800">Pengajuan Ditolak</h4>
                          <p className="text-sm text-red-700 mt-1">
                            Pengajuan SIMLOK Anda tidak dapat disetujui. Silakan hubungi admin untuk informasi lebih lanjut.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </DetailSection>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-6 mt-8">
              <div className="flex items-center space-x-3 justify-between w-full">
                {submission.approval_status === 'APPROVED' && submission.simlok_number && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadPdf}
                  >
                    <DocumentIcon className="w-4 h-4 mr-2" />
                    Lihat PDF
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DocumentPreviewModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        fileUrl={selectedDocument?.url || ''}
        fileName={selectedDocument?.title || ''}
      />

      <SimlokPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        submissionId={submission?.id || ''}
        submissionName={submission?.vendor_name || ''}
        nomorSimlok={submission?.simlok_number || ''}
      />
    </div>
  );
}
