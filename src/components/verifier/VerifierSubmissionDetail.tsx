'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
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
  ChatBubbleLeftRightIcon
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

interface VerifierSubmissionDetailProps {
  submission: Submission;
}

export default function VerifierSubmissionDetail({ submission }: VerifierSubmissionDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({
    isOpen: false,
    fileUrl: '',
    fileName: ''
  });
  const [simlokPdfModal, setSimlokPdfModal] = useState<{
    isOpen: boolean;
  }>({
    isOpen: false
  });

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

  const handleDownload = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      const convertedUrl = fileUrlHelper.convertLegacyUrl(fileUrl, fileName);
      const link = document.createElement('a');
      link.href = convertedUrl;
      const category = fileUrlHelper.getCategoryFromField(fileName, fileUrl);
      const downloadName = fileUrlHelper.generateDownloadFilename(fileUrl, category, fileName);
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileUrlHelper.isImage(fileName)) {
      return <img className="h-5 w-5 text-blue-500" />;
    }
    return <DocumentIcon className="h-5 w-5 text-gray-500" />;
  };

  const handleViewPDF = () => {
    setSimlokPdfModal({ isOpen: true });
  };

  const handleProvideComment = () => {
    router.push(`/verifier/submissions/${submission.id}/comment`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Review Submission
              </h1>
              <div className="flex items-center space-x-4 mt-2">
                {getStatusBadge(submission.status_approval_admin)}
                <span className="text-sm text-gray-500">
                  Dibuat: {formatDate(submission.created_at)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {submission.status_approval_admin === 'APPROVED' && (
                <Button
                  onClick={handleViewPDF}
                  variant="secondary"
                  size="sm"
                  className="flex items-center"
                >
                  <DocumentIcon className="h-4 w-4 mr-2" />
                  Lihat PDF
                </Button>
              )}
              
              <Button
                onClick={handleProvideComment}
                variant="primary"
                size="sm"
                className="flex items-center"
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                Berikan Komentar
              </Button>
              
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="sm"
              >
                Kembali
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'workers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Daftar Pekerja
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dokumen
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'verification'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Verifikasi
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <>
            {/* Ringkasan Submission */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Ringkasan Submission</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <BuildingOfficeIcon className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-500">Vendor</p>
                      <p className="font-semibold text-gray-900">{submission.nama_vendor}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <BriefcaseIcon className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-500">Pekerjaan</p>
                      <p className="font-semibold text-gray-900">{submission.pekerjaan}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="text-sm text-gray-500">Petugas</p>
                      <p className="font-semibold text-gray-900">{submission.nama_petugas}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Informasi Vendor */}
            <DetailSection 
              title="Informasi Vendor" 
              icon={<BuildingOfficeIcon className="h-5 w-5 text-blue-500" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoCard
                  label="Nama Vendor"
                  value={submission.nama_vendor}
                  copyable={true}
                />
                <InfoCard
                  label="Nama Petugas"
                  value={submission.nama_petugas}
                  icon={<UserIcon className="h-4 w-4 text-gray-500" />}
                />
                <InfoCard
                  label="Email"
                  value={submission.user.email}
                  copyable={true}
                />
                <InfoCard
                  label="Berdasarkan"
                  value={submission.berdasarkan}
                />
              </div>
            </DetailSection>

            {/* Detail Pekerjaan */}
            <DetailSection 
              title="Detail Pekerjaan" 
              icon={<BriefcaseIcon className="h-5 w-5 text-green-500" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoCard
                  label="Pekerjaan"
                  value={submission.pekerjaan}
                />
                <InfoCard
                  label="Lokasi Kerja"
                  value={submission.lokasi_kerja}
                />
                <InfoCard
                  label="Pelaksanaan"
                  value={submission.pelaksanaan || 'Belum diisi'}
                  icon={<CalendarIcon className="h-4 w-4 text-gray-500" />}
                />
                <InfoCard
                  label="Jam Kerja"
                  value={submission.jam_kerja}
                  icon={<ClockIcon className="h-4 w-4 text-gray-500" />}
                />
                <InfoCard
                  label="Sarana Kerja"
                  value={submission.sarana_kerja}
                  icon={<WrenchScrewdriverIcon className="h-4 w-4 text-gray-500" />}
                  className="md:col-span-2"
                />
              </div>
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
                    copyable={true}
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
                    copyable={true}
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
                    copyable={true}
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
          </>
        )}

        {/* Tab 2: Workers */}
        {activeTab === 'workers' && (
          <DetailSection 
            title="Daftar Pekerja untuk Verifikasi" 
            icon={<UserIcon className="h-5 w-5 text-purple-500" />}
            badge={
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Verifikasi Identitas
              </span>
            }
          >
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <UserIcon className="h-5 w-5 text-purple-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-purple-800">Petunjuk Verifikasi</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Pastikan semua data pekerja lengkap dan identitas sesuai dengan dokumen yang diupload. 
                    Perhatikan foto identitas dan kesesuaian nama dengan dokumen resmi.
                  </p>
                </div>
              </div>
            </div>
            
            <WorkersList
              submissionId={submission.id}
              fallbackWorkers={submission.nama_pekerja}
              layout="grid"
              showPhotos={true}
              maxDisplayCount={12}
              verificationMode={true}
            />
          </DetailSection>
        )}

        {/* Tab 3: Documents */}
        {activeTab === 'documents' && (
          <DetailSection 
            title="Dokumen untuk Review" 
            icon={<DocumentIcon className="h-5 w-5 text-blue-500" />}
            badge={
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {[submission.upload_doc_sika, submission.upload_doc_simja].filter(Boolean).length} dokumen
              </span>
            }
          >
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <DocumentIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Petunjuk Review Dokumen</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Periksa kelengkapan dokumen SIKA dan SIMJA. Pastikan dokumen dapat dibaca dengan jelas, 
                    tanggal masih berlaku, dan informasi sesuai dengan data submission.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dokumen SIKA */}
              {submission.upload_doc_sika ? (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(submission.upload_doc_sika)}
                      <div>
                        <h4 className="font-semibold text-gray-900">Dokumen SIKA</h4>
                        <p className="text-xs text-gray-500">Surat Izin Kerja Aman</p>
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      Tersedia
                    </span>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleFileView(submission.upload_doc_sika!, 'Dokumen SIKA')}
                      className="w-full flex items-center justify-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      Review Dokumen
                    </button>
                    <button
                      onClick={() => handleDownload(submission.upload_doc_sika!, 'Dokumen_SIKA.pdf')}
                      className="w-full flex items-center justify-center px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Download
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <XCircleIcon className="h-5 w-5 text-red-500" />
                    <h4 className="font-semibold text-red-900">Dokumen SIKA</h4>
                  </div>
                  <p className="text-sm text-red-700">Dokumen SIKA belum diupload</p>
                </div>
              )}

              {/* Dokumen SIMJA */}
              {submission.upload_doc_simja ? (
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(submission.upload_doc_simja)}
                      <div>
                        <h4 className="font-semibold text-gray-900">Dokumen SIMJA</h4>
                        <p className="text-xs text-gray-500">Surat Izin Masuk Area</p>
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      Tersedia
                    </span>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleFileView(submission.upload_doc_simja!, 'Dokumen SIMJA')}
                      className="w-full flex items-center justify-center px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      Review Dokumen
                    </button>
                    <button
                      onClick={() => handleDownload(submission.upload_doc_simja!, 'Dokumen_SIMJA.pdf')}
                      className="w-full flex items-center justify-center px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Download
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <XCircleIcon className="h-5 w-5 text-red-500" />
                    <h4 className="font-semibold text-red-900">Dokumen SIMJA</h4>
                  </div>
                  <p className="text-sm text-red-700">Dokumen SIMJA belum diupload</p>
                </div>
              )}
            </div>
          </DetailSection>
        )}

        {/* Tab 4: Verification */}
        {activeTab === 'verification' && (
          <DetailSection 
            title="Status Verifikasi" 
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
              {/* Checklist Verifikasi */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Checklist Verifikasi</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">Kelengkapan data vendor sudah sesuai</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">Detail pekerjaan jelas dan sesuai prosedur</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">Daftar pekerja lengkap dengan identitas yang valid</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">Dokumen SIKA tersedia dan dapat dibaca</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">Dokumen SIMJA tersedia dan dapat dibaca</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">Sarana kerja sesuai dengan pekerjaan yang akan dilakukan</span>
                  </div>
                </div>
              </div>

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
                  label="Keterangan Admin"
                  value={
                    <div className="whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 p-4 rounded-md border-l-4 border-blue-500">
                      {submission.keterangan}
                    </div>
                  }
                />
              )}

              {/* Action Recommendations */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Rekomendasi Verifikasi</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Berikan komentar atau saran perbaikan untuk submission ini melalui tombol "Berikan Komentar" di atas. 
                      Komentar Anda akan membantu proses review oleh admin.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DetailSection>
        )}
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
        submissionId={submission.id}
        submissionName={submission.nama_vendor}
        nomorSimlok={submission.nomor_simlok}
      />
    </div>
  );
}
