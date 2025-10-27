'use client';

import { useEffect, useState } from 'react';
import { 
  XMarkIcon, 
  EyeIcon, 
  DocumentIcon, 
  BuildingOfficeIcon,
  UserIcon,
  BriefcaseIcon,
  // CalendarIcon,
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
import NoteCard from '@/components/common/NoteCard';
import SupportDocumentsSection from '@/components/common/SupportDocumentsSection';
import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/Badge';
import type { Submission } from '@/types/submission';

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
    const label = STATUS_LABELS[status] ?? status;

    switch (status) {
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return <Badge variant="warning">{label}</Badge>;
      case 'APPROVED':
        return <Badge variant="success">{label}</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">{label}</Badge>;
      default:
        return <Badge variant="default">{label}</Badge>;
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
      <div className="flex min-h-full items-center justify-center p-0 sm:p-4">
        <div className="relative bg-white rounded-none sm:rounded-lg shadow-xl w-full h-full sm:max-w-6xl sm:w-full sm:max-h-[90vh] sm:h-auto flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4 sm:p-6 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Detail Pengajuan SIMLOK</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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
                  />
                  <InfoCard
                    label="Alamat Email"
                    value={submission.user_email || submission.user?.email || '-'}
                  />
                  {/* <InfoCard
                    label="Berdasarkan"
                    value={submission.based_on || '-'}
                  /> */}
                </div>
              </DetailSection>



              {/* Support Documents Section - New */}
              {submission.support_documents && submission.support_documents.length > 0 && (
                <SupportDocumentsSection
                  supportDocuments={submission.support_documents}
                  onViewDocument={handleFileView}
                />
              )}

              {/* Legacy Document Section - Fallback for old submissions */}
              {!submission.support_documents?.length && (submission.simja_document_upload || submission.sika_document_upload || submission.hsse_pass_document_upload) && (
                <DetailSection
                  title="File Dokumen (Legacy - Data Lama)"
                  icon={<DocumentIcon className="h-5 w-5 text-gray-500" />}
                >
                  <div className={`grid grid-cols-1 md:grid-cols-${submission.hsse_pass_document_upload ? '3' : '2'} gap-4`}>
                    {submission.simja_document_upload && (
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <DocumentIcon className="h-6 w-6 text-orange-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">Dokumen SIMJA</p>
                            <p className="text-sm text-gray-500">
                              {submission.simja_number || 'File tersedia'}
                            </p>
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

                    {submission.sika_document_upload && (
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <DocumentIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">Dokumen SIKA</p>
                            <p className="text-sm text-gray-500">
                              {submission.sika_number || 'File tersedia'}
                            </p>
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

                    {submission.hsse_pass_document_upload && (
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <DocumentIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">Dokumen HSSE Pass</p>
                            <p className="text-sm text-gray-500">
                              {submission.hsse_pass_number || 'File tersedia'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFileView(submission.hsse_pass_document_upload!, 'Dokumen HSSE Pass')}
                          className="flex items-center space-x-2"
                        >
                          <EyeIcon className="w-4 h-4" />
                          <span>Lihat</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </DetailSection>
              )}



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
                    label="Tanggal Mulai Pelaksanaan"
                    value={submission.implementation_start_date ? formatDate(submission.implementation_start_date) : '-'}
                  />
                  <InfoCard
                    label="Tanggal Selesai Pelaksanaan"
                    value={submission.implementation_end_date ? formatDate(submission.implementation_end_date) : '-'}
                  />
                  <InfoCard
                    label="Pelaksanaan"
                    value={submission.implementation || 'Akan diisi otomatis ketika sudah di setujui'}
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
                    maxDisplayCount={8}
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
                  {submission.note_for_vendor && (
                    <div className="md:col-span-2">
                      <NoteCard title="Catatan untuk Vendor" note={submission.note_for_vendor} />
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

            <div className="flex items-center justify-between border-t border-gray-200 pt-4 sm:pt-6 mt-6 sm:mt-8">
              <div className="flex items-center space-x-3 justify-between w-full">
                {submission.approval_status === 'APPROVED' && submission.simlok_number && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadPdf}
                    className="text-xs sm:text-sm"
                  >
                    <DocumentIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {submission?.approval_status === 'APPROVED' ? 'Lihat PDF' : 'Lihat Preview PDF'}
                    </span>
                    <span className="sm:hidden">
                      {submission?.approval_status === 'APPROVED' ? 'PDF' : 'Preview PDF'}
                    </span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-xs sm:text-sm"
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
