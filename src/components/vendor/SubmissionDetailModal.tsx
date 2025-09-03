'use client';

import { useEffect, useState } from 'react';
import { 
  XMarkIcon, 
  EyeIcon, 
  DocumentIcon, 
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
  UserIcon,
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as PendingIcon,
  PencilIcon
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
  status_approval_admin: string;
  nama_vendor: string;
  berdasarkan: string;
  nama_petugas: string;
  pekerjaan: string;
  lokasi_kerja: string;
  pelaksanaan: string | null;
  jam_kerja: string;
  lain_lain?: string;
  sarana_kerja: string;
  // tembusan?: string;
  nomor_simja?: string;
  tanggal_simja?: string | null;
  nomor_sika?: string;
  tanggal_sika?: string | null;
  nomor_simlok?: string;
  tanggal_simlok?: string | null;
  nama_pekerja: string;
  content: string;
  keterangan?: string;
  upload_doc_sika?: string;
  upload_doc_simja?: string;
  qrcode?: string;
  created_at: string;
  jabatan_signer?: string;
  nama_signer?: string;
  user: {
    id: string;
    nama_petugas: string;
    email: string;
    nama_vendor: string;
  };
  approvedByUser?: {
    id: string;
    nama_petugas: string;
    email: string;
  };
}

interface SubmissionDetailModalProps {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SubmissionDetailModal({ submission, isOpen, onClose }: SubmissionDetailModalProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({
    isOpen: false,
    fileUrl: '',
    fileName: ''
  });

  // SIMLOK PDF modal state
  const [simlokPdfModal, setSimlokPdfModal] = useState<{
    isOpen: boolean;
  }>({
    isOpen: false
  });

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { 
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <PendingIcon className="h-4 w-4 mr-1" />,
        text: 'Menunggu Review'
      },
      APPROVED: { 
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircleIcon className="h-4 w-4 mr-1" />,
        text: 'Disetujui'
      },
      REJECTED: { 
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: <XCircleIcon className="h-4 w-4 mr-1" />,
        text: 'Ditolak'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: null,
      text: status
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.className}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  const handleFileView = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      const convertedUrl = fileUrlHelper.convertLegacyUrl(fileUrl, fileName);
      setPreviewModal({
        isOpen: true,
        fileUrl: convertedUrl,
        fileName
      });
    }
  };



  if (!isOpen || !submission) return null;

  // Debug: log submission data
  console.log('Submission data:', submission);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto ">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] flex flex-col">
          
          {/* Header - Fixed */}
          <div className="bg-white flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-4">
              <h3 className="text-xl font-bold text-gray-900">
                Detail Submission SIMLOK
              </h3>
              {getStatusBadge(submission.status_approval_admin)}
              <span className="text-sm text-gray-500">
                Dibuat: {formatDate(submission.created_at)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
              title="Tutup Modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-white flex-shrink-0">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Detail Submission
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'status'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Status & Keterangan
              </button>
            </nav>
          </div>

          {/* Content - Scrollable */}
          <div className="bg-white flex-1 overflow-y-auto min-h-0 p-6">
            {/* Tab Content */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Debug Information */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs">
                    <h4 className="font-bold mb-2">Debug Info:</h4>
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify({
                        id: submission.id,
                        nama_vendor: submission.nama_vendor,
                        nama_petugas: submission.nama_petugas,
                        user: submission.user,
                        berdasarkan: submission.berdasarkan,
                        pekerjaan: submission.pekerjaan,
                        lokasi_kerja: submission.lokasi_kerja,
                        pelaksanaan: submission.pelaksanaan,
                        jam_kerja: submission.jam_kerja,
                        sarana_kerja: submission.sarana_kerja,
                        lain_lain: submission.lain_lain,
                        content: submission.content
                      }, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Informasi Vendor */}
                <DetailSection 
                  title="Informasi Vendor" 
                  icon={<BuildingOfficeIcon className="h-5 w-5 text-blue-500" />}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoCard
                      label="Nama Vendor"
                      value={submission.nama_vendor || '-'}
                    />
                    <InfoCard
                      label="Nama Petugas"
                      value={submission.nama_petugas || '-'}
                      icon={<UserIcon className="h-4 w-4 text-gray-500" />}
                    />
                    <InfoCard
                      label="Email"
                      value={submission.user?.email || '-'}
                    />
                    <InfoCard
                      label="Berdasarkan"
                      value={submission.berdasarkan || '-'}
                    />
                  </div>
                </DetailSection>

                {/* Detail Pekerjaan */}
                <DetailSection 
                  title="Informasi Pekerjaan" 
                  icon={<BriefcaseIcon className="h-5 w-5 text-green-500" />}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoCard
                      label="Pekerjaan"
                      value={submission.pekerjaan || '-'}
                    />
                    <InfoCard
                      label="Lokasi Kerja"
                      value={submission.lokasi_kerja || '-'}
                    />
                    <InfoCard
                      label="Pelaksanaan"
                      value={submission.pelaksanaan || 'Akan diisi oleh admin saat approval'}
                    />
                    <InfoCard
                      label="Jam Kerja"
                      value={submission.jam_kerja || '-'}
                    />
                    <InfoCard
                      label="Sarana Kerja"
                      value={submission.sarana_kerja || '-'}
                      className="md:col-span-2"
                    />
                  </div>

                  {submission.lain_lain && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <InfoCard
                        label="Lain-lain"
                        value={
                          <div className="whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                            {submission.lain_lain}
                          </div>
                        }
                      />
                    </div>
                  )}
                  
                  {submission.content && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <InfoCard
                        label="Content"
                        value={
                          <div className="whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                            {submission.content}
                          </div>
                        }
                      />
                    </div>
                  )}
                </DetailSection>

                {/* Daftar Pekerja */}
                <DetailSection 
                  title="Daftar Pekerja" 
                  icon={<UserIcon className="h-5 w-5 text-purple-500" />}
                >
                  {submission.nama_pekerja ? (
                      
                      <WorkersList
                        submissionId={submission.id}
                        fallbackWorkers={submission.nama_pekerja}
                        layout="grid"
                        showPhotos={true}
                        maxDisplayCount={6}
                      />
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">Tidak ada data pekerja</p>
                    </div>
                  )}
                </DetailSection>

                {/* Nomor Dokumen */}
                <DetailSection 
                  title="Informasi Dokumen" 
                  icon={<DocumentIcon className="h-5 w-5 text-orange-500" />}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {submission.nomor_simja && (
                      <InfoCard
                        label="Nomor SIMJA"
                        value={submission.nomor_simja}
                      />
                    )}
                    {submission.tanggal_simja && (
                      <InfoCard
                        label="Tanggal SIMJA"
                        value={formatDate(submission.tanggal_simja)}
                        icon={<CalendarIcon className="h-4 w-4 text-gray-500" />}
                      />
                    )}
                    {submission.nomor_sika && (
                      <InfoCard
                        label="Nomor SIKA"
                        value={submission.nomor_sika}
                      />
                    )}
                    {submission.tanggal_sika && (
                      <InfoCard
                        label="Tanggal SIKA"
                        value={formatDate(submission.tanggal_sika)}
                        icon={<CalendarIcon className="h-4 w-4 text-gray-500" />}
                      />
                    )}
                    {submission.status_approval_admin === 'APPROVED' && submission.nomor_simlok && (
                      <InfoCard
                        label="Nomor SIMLOK"
                        value={submission.nomor_simlok}
                      />
                    )}
                    {submission.status_approval_admin === 'APPROVED' && submission.tanggal_simlok && (
                      <InfoCard
                        label="Tanggal SIMLOK"
                        value={formatDate(submission.tanggal_simlok)}
                        icon={<CalendarIcon className="h-4 w-4 text-gray-500" />}
                      />
                    )}
                  </div>
                </DetailSection>

                {/* Dokumen Upload dalam Detail */}
                <DetailSection 
                  title="Dokumen Upload" 
                  icon={<DocumentIcon className="h-5 w-5 text-blue-500" />}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Dokumen SIKA */}
                    {submission.upload_doc_sika && (
                      <div className="border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <DocumentIcon className="h-5 w-5 text-blue-500" />
                            <div>
                              <h4 className="font-medium text-gray-900">Dokumen SIKA</h4>
                              <p className="text-xs text-gray-500">Surat Izin Kerja Aman</p>
                            </div>
                          </div>
                          
                        </div>
                        <button
                          onClick={() => handleFileView(submission.upload_doc_sika!, 'Dokumen SIKA')}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Preview Dokumen
                        </button>
                      </div>
                    )}

                    {/* Dokumen SIMJA */}
                    {submission.upload_doc_simja && (
                      <div className="border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <DocumentIcon className="h-5 w-5 text-green-500" />
                            <div>
                              <h4 className="font-medium text-gray-900">Dokumen SIMJA</h4>
                              <p className="text-xs text-gray-500">Surat Izin Masuk Area</p>
                            </div>
                          </div>
                          
                        </div>
                        <button
                          onClick={() => handleFileView(submission.upload_doc_simja!, 'Dokumen SIMJA')}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Preview Dokumen
                        </button>
                      </div>
                    )}

                    {/* Message if no documents */}
                    {!submission.upload_doc_sika && !submission.upload_doc_simja && (
                      <div className="md:col-span-2 text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">Tidak ada dokumen</h3>
                        <p className="text-sm text-gray-500">Belum ada dokumen yang diupload</p>
                      </div>
                    )}
                  </div>
                </DetailSection>

                {/* Informasi Penandatangan - hanya tampil jika ada */}
                {(submission.jabatan_signer || submission.nama_signer) && (
                  <DetailSection 
                    title="Informasi Penandatangan" 
                    icon={<UserIcon className="h-5 w-5 text-indigo-500" />}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InfoCard
                        label="Jabatan Penandatangan"
                        value={submission.jabatan_signer || '-'}
                      />
                      <InfoCard
                        label="Nama Penandatangan"
                        value={submission.nama_signer || '-'}
                      />
                    </div>
                  </DetailSection>
                )}
              </div>
            )}

            {/* Tab 2: Status */}
            {activeTab === 'status' && (
              <DetailSection 
                title="Status & Keterangan" 
                icon={
                  submission.status_approval_admin === 'APPROVED' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : submission.status_approval_admin === 'REJECTED' ? (
                    <XCircleIcon className="h-5 w-5 text-red-500" />
                  ) : (
                    <PendingIcon className="h-5 w-5 text-yellow-500" />
                  )
                }
                badge={getStatusBadge(submission.status_approval_admin)}
              >
                <div className="space-y-6">
                  <InfoCard
                    label="Status Saat Ini"
                    value={getStatusBadge(submission.status_approval_admin)}
                  />
                  
                  {submission.approvedByUser && (
                    <InfoCard
                      label="Disetujui Oleh"
                      value={submission.approvedByUser.nama_petugas}
                      icon={<UserIcon className="h-4 w-4 text-gray-500" />}
                    />
                  )}
                  
                  {submission.keterangan && (
                    <InfoCard
                      label="Keterangan"
                      value={
                        <div className="whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 p-4 rounded-md border-l-4 border-blue-500">
                          {submission.keterangan}
                        </div>
                      }
                    />
                  )}

                  {/* Status-specific information */}
                  {submission.status_approval_admin === 'PENDING' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <PendingIcon className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800">Menunggu Review</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            Submission Anda sedang dalam proses review oleh admin. 
                            Anda masih dapat melakukan edit jika diperlukan.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {submission.status_approval_admin === 'APPROVED' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-green-800">Submission Disetujui</h4>
                          <p className="text-sm text-green-700 mt-1">
                            Selamat! Submission Anda telah disetujui. Anda dapat mendownload PDF SIMLOK dari footer.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {submission.status_approval_admin === 'REJECTED' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-red-800">Submission Ditolak</h4>
                          <p className="text-sm text-red-700 mt-1">
                            Submission Anda ditolak. Silakan periksa keterangan di atas dan buat submission baru dengan perbaikan yang diperlukan.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </DetailSection>
            )}
          </div>

          {/* Footer - Always visible with better positioning */}
          <div className="bg-white flex justify-between items-center p-6 border-t border-gray-200 flex-shrink-0">
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {submission.status_approval_admin === 'APPROVED' && submission.nomor_simlok && (
                <Button
                  onClick={() => setSimlokPdfModal({ isOpen: true })}
                  variant="primary"
                  size="sm"
                  className="flex items-center"
                  title="Lihat PDF SIMLOK yang sudah disetujui"
                >
                  <DocumentIcon className="h-4 w-4 mr-2" />
                  Lihat PDF SIMLOK
                </Button>
              )}
            </div>

            <div className="flex-1"></div>
            
            <Button
              onClick={onClose}
              variant="secondary"
              size="sm"
              className="flex-shrink-0"
            >
              Tutup
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, fileUrl: '', fileName: '' })}
        fileUrl={previewModal.fileUrl}
        fileName={previewModal.fileName}
      />

      <SimlokPdfModal
        isOpen={simlokPdfModal.isOpen}
        onClose={() => setSimlokPdfModal({ isOpen: false })}
        submissionId={submission?.id || ''}
        submissionName={submission?.nama_vendor || ''}
        nomorSimlok={submission?.nomor_simlok}
      />
    </div>
  );
}
