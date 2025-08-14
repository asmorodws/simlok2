'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, EyeIcon, DocumentIcon, ArrowDownTrayIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { fileUrlHelper } from '@/lib/fileUrlHelper';
import FilePreview from '@/components/common/FilePreview';

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

interface AdminSubmissionDetailModalProps {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmissionUpdate?: (updatedSubmission: Submission) => void;
}

export default function AdminSubmissionDetailModal({ 
  submission, 
  isOpen, 
  onClose,
  onSubmissionUpdate
}: AdminSubmissionDetailModalProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvalForm, setApprovalForm] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED',
    keterangan: '',
    tembusan: '',
    nomor_simlok: '',
    tanggal_simlok: ''
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset approval form when modal opens
      if (submission) {
        setApprovalForm({
          status: 'APPROVED',
          keterangan: submission.keterangan || '',
          tembusan: submission.tembusan || '',
          nomor_simlok: submission.nomor_simlok || '',
          tanggal_simlok: submission.tanggal_simlok ? new Date(submission.tanggal_simlok).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, submission]);

  if (!isOpen || !submission) return null;

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
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800'
      }`}>
        {status}
      </span>
    );
  };

  const handleFileView = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      // Convert legacy URL to new format if needed
      const convertedUrl = fileUrlHelper.convertLegacyUrl(fileUrl, fileName);
      setPreviewFile({ url: convertedUrl, name: fileName });
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      // Convert legacy URL to new format if needed
      const convertedUrl = fileUrlHelper.convertLegacyUrl(fileUrl, fileName);
      
      const link = document.createElement('a');
      link.href = convertedUrl;
      
      // Generate appropriate download filename
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
      return <PhotoIcon className="h-5 w-5 text-blue-500" />;
    }
    return <DocumentIcon className="h-5 w-5 text-gray-500" />;
  };

  const getDisplayFileName = (fileUrl: string) => {
    const filename = fileUrl.split('/').pop() || '';
    return fileUrlHelper.getDisplayFilename(filename);
  };

  const handleApprovalSubmit = async () => {
    if (!submission) return;

    // Validasi untuk approve: harus ada nomor SIMLOK
    if (approvalForm.status === 'APPROVED' && !approvalForm.nomor_simlok.trim()) {
      alert('Nomor SIMLOK harus diisi untuk menyetujui submission');
      return;
    }

    // Validasi untuk reject: harus ada keterangan
    if (approvalForm.status === 'REJECTED' && !approvalForm.keterangan.trim()) {
      alert('Keterangan harus diisi untuk menolak submission');
      return;
    }

    setIsProcessing(true);
    try {
      const requestBody: any = {
        status_approval_admin: approvalForm.status,
        keterangan: approvalForm.keterangan,
        tembusan: approvalForm.tembusan,
      };

      // Hanya tambahkan nomor SIMLOK dan tanggal jika di-approve
      if (approvalForm.status === 'APPROVED') {
        requestBody.nomor_simlok = approvalForm.nomor_simlok;
        requestBody.tanggal_simlok = approvalForm.tanggal_simlok;
      }

      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to update submission');
      }

      const updatedSubmission = await response.json();
      
      // Update parent component if callback provided
      if (onSubmissionUpdate) {
        onSubmissionUpdate(updatedSubmission);
      }

      // Show success message or close modal
      alert(`Submission berhasil ${approvalForm.status === 'APPROVED' ? 'disetujui' : 'ditolak'}`);
      onClose();
    } catch (error) {
      console.error('Error updating submission:', error);
      alert('Terjadi kesalahan saat memproses approval');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Detail Submission - {submission.nama_vendor}
              </h2>
              <div className="flex items-center space-x-4 mt-2">
                {getStatusBadge(submission.status_approval_admin)}
                <span className="text-sm text-gray-500">
                  {formatDate(submission.created_at)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 flex-shrink-0">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Detail Submission
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dokumen Upload
              </button>
              <button
                onClick={() => setActiveTab('approval')}
                data-tab="approval"
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'approval'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Status Approval
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-6">
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Informasi Vendor */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informasi Vendor</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nama Vendor</label>
                      <p className="mt-1 text-sm text-gray-900">{submission.nama_vendor}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nama Petugas</label>
                      <p className="mt-1 text-sm text-gray-900">{submission.nama_petugas}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{submission.user.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Berdasarkan</label>
                      <p className="mt-1 text-sm text-gray-900">{submission.berdasarkan}</p>
                    </div>
                  </div>
                </div>

                {/* Detail Pekerjaan */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Detail Pekerjaan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pekerjaan</label>
                      <p className="mt-1 text-sm text-gray-900">{submission.pekerjaan}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Lokasi Kerja</label>
                      <p className="mt-1 text-sm text-gray-900">{submission.lokasi_kerja}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pelaksanaan</label>
                      <p className="mt-1 text-sm text-gray-900">{submission.pelaksanaan}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Jam Kerja</label>
                      <p className="mt-1 text-sm text-gray-900">{submission.jam_kerja}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nama Pekerja</label>
                      <p className="mt-1 text-sm text-gray-900">{submission.nama_pekerja}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sarana Kerja</label>
                      <p className="mt-1 text-sm text-gray-900">{submission.sarana_kerja}</p>
                    </div>
                  </div>
                  {submission.lain_lain && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">Lain-lain</label>
                      <p className="mt-1 text-sm text-gray-900">{submission.lain_lain}</p>
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Content</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{submission.content}</p>
                  </div>
                </div>

                {/* Nomor Dokumen */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informasi Dokumen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {submission.nomor_simja && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nomor SIMJA</label>
                        <p className="mt-1 text-sm text-gray-900">{submission.nomor_simja}</p>
                      </div>
                    )}
                    {submission.tanggal_simja && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tanggal SIMJA</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(submission.tanggal_simja)}</p>
                      </div>
                    )}
                    {submission.nomor_sika && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nomor SIKA</label>
                        <p className="mt-1 text-sm text-gray-900">{submission.nomor_sika}</p>
                      </div>
                    )}
                    {submission.tanggal_sika && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tanggal SIKA</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(submission.tanggal_sika)}</p>
                      </div>
                    )}
                    {submission.nomor_simlok && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nomor SIMLOK</label>
                        <p className="mt-1 text-sm text-gray-900">{submission.nomor_simlok}</p>
                      </div>
                    )}
                    {submission.tanggal_simlok && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tanggal SIMLOK</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(submission.tanggal_simlok)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Dokumen yang Diupload</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Dokumen SIKA */}
                  {submission.upload_doc_sika && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getFileIcon(submission.upload_doc_sika)}
                          <h4 className="font-medium text-gray-900">Dokumen SIKA</h4>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleFileView(submission.upload_doc_sika!, 'Dokumen SIKA')}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Preview
                        </button>
                        <button
                          onClick={() => handleDownload(submission.upload_doc_sika!, 'Dokumen_SIKA.pdf')}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dokumen SIMJA */}
                  {submission.upload_doc_simja && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getFileIcon(submission.upload_doc_simja)}
                          <h4 className="font-medium text-gray-900">Dokumen SIMJA</h4>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleFileView(submission.upload_doc_simja!, 'Dokumen SIMJA')}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Preview
                        </button>
                        <button
                          onClick={() => handleDownload(submission.upload_doc_simja!, 'Dokumen_SIMJA.pdf')}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ID Card */}
                  {submission.upload_doc_id_card && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getFileIcon(submission.upload_doc_id_card)}
                          <h4 className="font-medium text-gray-900">ID Card</h4>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleFileView(submission.upload_doc_id_card!, 'ID Card')}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Preview
                        </button>
                        <button
                          onClick={() => handleDownload(submission.upload_doc_id_card!, 'ID_Card')}
                          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message if no documents */}
                {!submission.upload_doc_sika && !submission.upload_doc_simja && !submission.upload_doc_id_card && (
                  <div className="text-center py-8">
                    <DocumentIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Tidak ada dokumen yang diupload</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'approval' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status Approval</h3>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status Saat Ini</label>
                      <div className="mt-1">
                        {getStatusBadge(submission.status_approval_admin)}
                      </div>
                    </div>
                    {submission.approvedByUser && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Disetujui Oleh</label>
                        <p className="mt-1 text-sm text-gray-900">{submission.approvedByUser.nama_petugas}</p>
                      </div>
                    )}
                    {submission.keterangan && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Keterangan</label>
                        <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{submission.keterangan}</p>
                      </div>
                    )}
                    {submission.tembusan && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Tembusan</label>
                        <p className="mt-1 text-sm text-gray-900">{submission.tembusan}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Approval Form - Only show if status is PENDING */}
                {submission.status_approval_admin === 'PENDING' && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Proses Approval</h4>
                    
                    <div className="space-y-4">
                      {/* Status Dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status Keputusan <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={approvalForm.status}
                          onChange={(e) => setApprovalForm(prev => ({ 
                            ...prev, 
                            status: e.target.value as 'APPROVED' | 'REJECTED'
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="APPROVED">Setujui</option>
                          <option value="REJECTED">Tolak</option>
                        </select>
                      </div>

                      {/* Nomor SIMLOK - Only show if APPROVED */}
                      {approvalForm.status === 'APPROVED' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nomor SIMLOK <span className="text-red-500">*</span>
                              <span className="text-xs text-gray-500 ml-1">(Wajib untuk menyetujui)</span>
                            </label>
                            <input
                              type="text"
                              value={approvalForm.nomor_simlok}
                              onChange={(e) => setApprovalForm(prev => ({ ...prev, nomor_simlok: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Contoh: SIMLOK/2024/001"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tanggal SIMLOK <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={approvalForm.tanggal_simlok}
                              onChange={(e) => setApprovalForm(prev => ({ ...prev, tanggal_simlok: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Keterangan {approvalForm.status === 'REJECTED' && <span className="text-red-500">*</span>}
                          {approvalForm.status === 'REJECTED' && <span className="text-xs text-gray-500 ml-1">(Wajib untuk menolak)</span>}
                        </label>
                        <textarea
                          value={approvalForm.keterangan}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, keterangan: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={
                            approvalForm.status === 'APPROVED' 
                              ? "Tambahkan catatan approval (opsional)..." 
                              : "Alasan penolakan (wajib diisi)..."
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tembusan (Opsional)
                        </label>
                        <input
                          type="text"
                          value={approvalForm.tembusan}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, tembusan: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Contoh: Kepala Bagian, Manager, dll."
                        />
                      </div>

                      <div className="pt-4">
                        <button
                          onClick={handleApprovalSubmit}
                          disabled={isProcessing}
                          className={`w-full font-medium py-3 px-4 rounded-md transition-colors ${
                            approvalForm.status === 'APPROVED'
                              ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white'
                              : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white'
                          }`}
                        >
                          {isProcessing ? 'Memproses...' : 'Simpan Perubahan'}
                        </button>
                      </div>

                      {/* Validation hints */}
                      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
                        <p className="font-medium mb-1">Catatan:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {approvalForm.status === 'APPROVED' ? (
                            <>
                              <li>Nomor SIMLOK dan Tanggal SIMLOK wajib diisi</li>
                              <li>Keterangan bersifat opsional</li>
                            </>
                          ) : (
                            <>
                              <li>Keterangan alasan penolakan wajib diisi</li>
                              <li>Jelaskan alasan penolakan secara detail</li>
                            </>
                          )}
                          <li>Tembusan bersifat opsional</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* QR Code if approved */}
                {submission.qrcode && submission.status_approval_admin === 'APPROVED' && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">QR Code</h4>
                    <img 
                      src={submission.qrcode} 
                      alt="QR Code" 
                      className="max-w-48 h-auto border border-gray-200 rounded"
                    />
                  </div>
                )}
              </div>
            )}
            </div>
          </div>

          {/* Footer - Always visible */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-white flex-shrink-0">
            {/* Show approval button only for PENDING submissions in approval tab */}
            {submission.status_approval_admin === 'PENDING' && activeTab === 'approval' && (
              <button
                onClick={handleApprovalSubmit}
                disabled={isProcessing}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Simpan Perubahan</span>
                )}
              </button>
            )}
            <div className="flex-1"></div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-60 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{previewFile.name}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-4">
              {previewFile.url.includes('.pdf') ? (
                <iframe
                  src={previewFile.url}
                  className="w-full h-96"
                  title={previewFile.name}
                />
              ) : (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full h-auto"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}