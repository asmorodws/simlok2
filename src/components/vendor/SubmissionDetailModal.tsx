'use client';

import { useEffect } from 'react';
import { XMarkIcon, EyeIcon, DocumentIcon } from '@heroicons/react/24/outline';

interface Submission {
  id: string;
  status_approval_admin: string;
  nama_vendor: string;
  berdasarkan: string;
  nama_petugas: string;
  pekerjaan: string;
  lokasi_kerja: string;
  pelaksanaan: string;
  jam_kerja: string;
  lain_lain?: string;
  sarana_kerja: string;
  tembusan?: string;
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
  upload_doc_id_card?: string;
  qrcode?: string;
  created_at: string;
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

  if (!isOpen || !submission) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'PENDING': "bg-yellow-100 text-yellow-800 border-yellow-200",
      'APPROVED': "bg-green-100 text-green-800 border-green-200",
      'REJECTED': "bg-red-100 text-red-800 border-red-200"
    };
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full border ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status}
      </span>
    );
  };

  const handleFileView = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-black/30 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-white flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Detail Pengajuan SIMLOK
              </h3>
              {getStatusBadge(submission.status_approval_admin)}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="bg-white p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Informasi Vendor */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Informasi Vendor
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nama Vendor</label>
                    <p className="text-sm text-gray-900">{submission.nama_vendor}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nama Petugas</label>
                    <p className="text-sm text-gray-900">{submission.nama_petugas}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{submission.user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Berdasarkan</label>
                    <p className="text-sm text-gray-900">{submission.berdasarkan}</p>
                  </div>
                </div>
              </div>

              {/* Informasi Pekerjaan */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Informasi Pekerjaan
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Jenis Pekerjaan</label>
                    <p className="text-sm text-gray-900">{submission.pekerjaan}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lokasi Kerja</label>
                    <p className="text-sm text-gray-900">{submission.lokasi_kerja}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Waktu Pelaksanaan</label>
                    <p className="text-sm text-gray-900">{submission.pelaksanaan}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Jam Kerja</label>
                    <p className="text-sm text-gray-900">{submission.jam_kerja}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nama Pekerja</label>
                    <p className="text-sm text-gray-900">{submission.nama_pekerja}</p>
                  </div>
                </div>
              </div>

              {/* Detail Teknis */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Detail Teknis
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Sarana Kerja</label>
                    <p className="text-sm text-gray-900">{submission.sarana_kerja}</p>
                  </div>
                  {submission.lain_lain && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Lain-lain</label>
                      <p className="text-sm text-gray-900">{submission.lain_lain}</p>
                    </div>
                  )}
                  {submission.tembusan && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tembusan</label>
                      <p className="text-sm text-gray-900">{submission.tembusan}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Konten/Deskripsi</label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{submission.content}</p>
                  </div>
                </div>
              </div>

              {/* Nomor Dokumen */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Nomor Dokumen
                </h4>
                <div className="space-y-3">
                  {submission.nomor_simja && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nomor SIMJA</label>
                      <p className="text-sm text-gray-900">{submission.nomor_simja}</p>
                      {submission.tanggal_simja && (
                        <p className="text-xs text-gray-500">Tanggal: {formatDate(submission.tanggal_simja)}</p>
                      )}
                    </div>
                  )}
                  {submission.nomor_sika && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nomor SIKA</label>
                      <p className="text-sm text-gray-900">{submission.nomor_sika}</p>
                      {submission.tanggal_sika && (
                        <p className="text-xs text-gray-500">Tanggal: {formatDate(submission.tanggal_sika)}</p>
                      )}
                    </div>
                  )}
                  {submission.nomor_simlok && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nomor SIMLOK</label>
                      <p className="text-sm text-gray-900">{submission.nomor_simlok}</p>
                      {submission.tanggal_simlok && (
                        <p className="text-xs text-gray-500">Tanggal: {formatDate(submission.tanggal_simlok)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Dokumen Upload */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Dokumen Upload
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {submission.upload_doc_sika && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <DocumentIcon className="w-5 h-5 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900">Dokumen SIKA</span>
                      </div>
                      <button
                        onClick={() => handleFileView(submission.upload_doc_sika!, 'Dokumen SIKA')}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>Lihat Dokumen</span>
                      </button>
                    </div>
                  )}
                  {submission.upload_doc_simja && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <DocumentIcon className="w-5 h-5 text-green-500" />
                        <span className="text-sm font-medium text-gray-900">Dokumen SIMJA</span>
                      </div>
                      <button
                        onClick={() => handleFileView(submission.upload_doc_simja!, 'Dokumen SIMJA')}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>Lihat Dokumen</span>
                      </button>
                    </div>
                  )}
                  {submission.upload_doc_id_card && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <DocumentIcon className="w-5 h-5 text-purple-500" />
                        <span className="text-sm font-medium text-gray-900">ID Card</span>
                      </div>
                      <button
                        onClick={() => handleFileView(submission.upload_doc_id_card!, 'ID Card')}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>Lihat Dokumen</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status dan Approval */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Status dan Approval
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status Approval</label>
                    <div className="mt-1">
                      {getStatusBadge(submission.status_approval_admin)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tanggal Dibuat</label>
                    <p className="text-sm text-gray-900">{formatDate(submission.created_at)}</p>
                  </div>
                  {submission.approvedByUser && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Disetujui oleh</label>
                      <p className="text-sm text-gray-900">{submission.approvedByUser.nama_petugas}</p>
                      <p className="text-xs text-gray-500">{submission.approvedByUser.email}</p>
                    </div>
                  )}
                  {submission.keterangan && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Keterangan</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{submission.keterangan}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code */}
              {submission.qrcode && (
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    QR Code
                  </h4>
                  <div className="flex justify-center">
                    <img 
                      src={submission.qrcode} 
                      alt="QR Code SIMLOK" 
                      className="w-32 h-32 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white flex justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
