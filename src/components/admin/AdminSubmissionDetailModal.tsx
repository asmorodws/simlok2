'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, EyeIcon, DocumentIcon, ArrowDownTrayIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { fileUrlHelper } from '@/lib/fileUrlHelper';
import DatePicker from '@/components/form/DatePicker';
import DocumentPreviewModal from '@/components/common/DocumentPreviewModal';
import SimlokPdfModal from '@/components/common/SimlokPdfModal';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    nomor_simlok: '',
    pelaksanaan: '',
    keterangan: '',
    tembusan: ''
  });
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [approvalForm, setApprovalForm] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED',
    keterangan: '',
    tembusan: '',
    nomor_simlok: '',
    tanggal_simlok: '',
    pelaksanaan: '',
    lain_lain: '',
    content: '',
    jabatan_signer: '',
    nama_signer: ''
  });

  // Template helper fields (tidak disimpan ke database)
  const [templateFields, setTemplateFields] = useState({
    tanggal_dari: '',
    tanggal_sampai: '',
    tanggal_diterima_security: ''
  });

  // Preview modal state
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

  // Main useEffect for modal state management
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset approval form when modal opens
      if (submission) {
        // Function to format date in local timezone for input fields
        const formatDateForInput = (dateString: string | null | undefined): string => {
          if (!dateString) {
            // Return today's date in local timezone
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          
          const date = new Date(dateString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        setApprovalForm({
          status: 'APPROVED',
          keterangan: submission.keterangan || '',
          tembusan: submission.tembusan || '',
          nomor_simlok: submission.nomor_simlok || '',
          tanggal_simlok: formatDateForInput(submission.tanggal_simlok),
          pelaksanaan: submission.pelaksanaan || '',
          lain_lain: submission.lain_lain || '',
          content: submission.content || 'Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis.',
          jabatan_signer: submission.jabatan_signer || '',
          nama_signer: submission.nama_signer || ''
        });

        // Reset template fields
        setTemplateFields({
          tanggal_dari: '',
          tanggal_sampai: '',
          tanggal_diterima_security: ''
        });

        // Reset validation errors
        setValidationErrors({
          nomor_simlok: '',
          pelaksanaan: '',
          keterangan: '',
          tembusan: ''
        });
        setShowErrorAlert(false);
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, submission]);

// templaet pelaksanaan
  useEffect(() => {
    if (templateFields.tanggal_dari && templateFields.tanggal_sampai) {
      const template = `Terhitung mulai tanggal ${formatDate(templateFields.tanggal_dari)} sampai ${formatDate(templateFields.tanggal_sampai)}. Termasuk hari Sabtu, Minggu dan hari libur lainnya.`;
      setApprovalForm(prev => ({ ...prev, pelaksanaan: template }));
    }
  }, [templateFields.tanggal_dari, templateFields.tanggal_sampai]);

// Template generator untuk lain-lain
  useEffect(() => {
    const generateLainLainTemplate = () => {
      const templateParts = [];
      
      // Header template
      templateParts.push("Izin diberikan berdasarkan:");
      
      // SIMJA section
      if (submission?.nomor_simja && submission?.tanggal_simja) {
        templateParts.push(
          `• Simja Ast Man Facility Management`,
          `  ${submission.nomor_simja} Tgl. ${formatDate(submission.tanggal_simja)}`
        );
      }
      
      // SIKA section  
      if (submission?.nomor_sika && submission?.tanggal_sika) {
        templateParts.push(
          `• SIKA Pekerjaan Dingin`,
          `  ${submission.nomor_sika} Tgl. ${formatDate(submission.tanggal_sika)}`
        );
      }
      
      // Head of Security section
      if (templateFields.tanggal_diterima_security) {
        templateParts.push(
          ` \n`,
          ` Diterima ${submission?.jabatan_signer || approvalForm.jabatan_signer || '[Jabatan akan diisi saat approval]'}`,
          `  ${formatDate(templateFields.tanggal_diterima_security)}`
        );
      }
      
      return templateParts.join('\n');
    };

    // Update template jika ada data yang diperlukan
    const shouldUpdate = templateFields.tanggal_diterima_security || 
                        (submission?.nomor_simja && submission?.nomor_sika);
    
    if (shouldUpdate) {
      const newTemplate = generateLainLainTemplate();
      setApprovalForm(prev => ({ ...prev, lain_lain: newTemplate }));
    }
  }, [templateFields.tanggal_diterima_security, submission?.nomor_simja, submission?.tanggal_simja, submission?.nomor_sika, submission?.tanggal_sika, submission?.jabatan_signer, approvalForm.jabatan_signer]);

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

  // Function to format and display nama pekerja as list
  const formatNamaPekerjaDisplay = (namaPekerja: string) => {
    if (!namaPekerja) return [];
    return namaPekerja
      .split(/[\n,]+/) // Split by newlines or commas
      .map(nama => nama.trim())
      .filter(nama => nama.length > 0);
  };

  // Function to format and display tembusan as list
  const formatTembusanDisplay = (tembusan: string) => {
    if (!tembusan) return [];
    return tembusan
      .split(/[\n,]+/) // Split by newlines or commas
      .map(item => item.trim())
      .filter(item => item.length > 0);
  };

 
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800'
        }`}>
        {status}
      </span>
    );
  };

  const handleFileView = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      // Convert legacy URL to new format if needed
      const convertedUrl = fileUrlHelper.convertLegacyUrl(fileUrl, fileName);
      setPreviewModal({
        isOpen: true,
        fileUrl: convertedUrl,
        fileName
      });
    }
  };

  const handleClosePreview = () => {
    setPreviewModal({
      isOpen: false,
      fileUrl: '',
      fileName: ''
    });
  };

  const handleCloseSilmokPdf = () => {
    setSimlokPdfModal({ isOpen: false });
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

  const validateForm = () => {
    const errors = {
      nomor_simlok: '',
      pelaksanaan: '',
      keterangan: '',
      tembusan: ''
    };

    let hasErrors = false;

    // Validasi untuk approve: harus ada nomor SIMLOK dan pelaksanaan
    if (approvalForm.status === 'APPROVED' && !approvalForm.nomor_simlok.trim()) {
      errors.nomor_simlok = 'Nomor SIMLOK harus diisi untuk menyetujui submission';
      hasErrors = true;
    }

    // Validasi pelaksanaan wajib diisi
    if (!approvalForm.pelaksanaan.trim()) {
      errors.pelaksanaan = 'Pelaksanaan harus diisi';
      hasErrors = true;
    }

    // Validasi keterangan wajib diisi
    if (!approvalForm.keterangan.trim()) {
      errors.keterangan = 'Keterangan harus diisi';
      hasErrors = true;
    }

    // Validasi tembusan wajib diisi
    if (!approvalForm.tembusan.trim()) {
      errors.tembusan = 'Tembusan harus diisi';
      hasErrors = true;
    }

    setValidationErrors(errors);

    if (hasErrors) {
      setErrorMessage('Mohon lengkapi semua field yang wajib diisi');
      setShowErrorAlert(true);
      // Auto hide after 5 seconds
      setTimeout(() => setShowErrorAlert(false), 5000);
    }

    return !hasErrors;
  };

  const clearFieldError = (fieldName: keyof typeof validationErrors) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleViewPDF = async () => {
    if (!submission) return;
    
    try {
      // Generate PDF URL with correct submission ID  
      const pdfUrl = `/api/submissions/${submission.id}?format=pdf`;
      
      // Test if PDF can be generated first
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      
      if (!response.ok) {
        setErrorMessage('Gagal memuat PDF. Pastikan semua data sudah lengkap.');
        setShowErrorAlert(true);
        setTimeout(() => setShowErrorAlert(false), 5000);
        return;
      }
      
      // Open SIMLOK PDF modal instead of new tab
      setSimlokPdfModal({ isOpen: true });
    } catch (error) {
      console.error('Error viewing PDF:', error);
      setErrorMessage('Terjadi kesalahan saat membuka PDF');
      setShowErrorAlert(true);
      setTimeout(() => setShowErrorAlert(false), 5000);
    }
  };

  const handleApprovalSubmit = async () => {
    if (!submission) return;

    // Validasi form
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    setShowErrorAlert(false);

    try {
      const requestBody: any = {
        status_approval_admin: approvalForm.status,
        keterangan: approvalForm.keterangan,
        tembusan: approvalForm.tembusan,
        pelaksanaan: approvalForm.pelaksanaan,
        lain_lain: approvalForm.lain_lain,
        content: approvalForm.content,
        jabatan_signer: approvalForm.jabatan_signer,
        nama_signer: approvalForm.nama_signer,
      };

      // Hanya tambahkan nomor SIMLOK dan tanggal jika di-approve
      if (approvalForm.status === 'APPROVED') {
        requestBody.nomor_simlok = approvalForm.nomor_simlok;
        requestBody.tanggal_simlok = approvalForm.tanggal_simlok;
      }

      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });      if (!response.ok) {
        throw new Error('Failed to update submission');
      }

      const updatedSubmission = await response.json();

      // Update parent component if callback provided
      if (onSubmissionUpdate) {
        onSubmissionUpdate(updatedSubmission);
      }

      // Show success message - using custom notification instead of alert
      setErrorMessage(`Submission berhasil ${approvalForm.status === 'APPROVED' ? 'disetujui' : 'ditolak'}`);
      setShowErrorAlert(true);
      setTimeout(() => {
        setShowErrorAlert(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error updating submission:', error);
      setErrorMessage('Terjadi kesalahan saat memproses approval');
      setShowErrorAlert(true);
      setTimeout(() => setShowErrorAlert(false), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>

      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Custom Error/Success Alert */}
        {showErrorAlert && (
          <div className="fixed top-4 right-4 z-[100] animate-bounce">
            <div className={`max-w-md w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${
              errorMessage.includes('berhasil') 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {errorMessage.includes('berhasil') ? (
                      <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className={`text-sm font-medium ${
                      errorMessage.includes('berhasil') ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {errorMessage.includes('berhasil') ? 'Berhasil!' : 'Validasi Error'}
                    </p>
                    <p className={`mt-1 text-sm ${
                      errorMessage.includes('berhasil') ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {errorMessage}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      onClick={() => setShowErrorAlert(false)}
                      className={`rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        errorMessage.includes('berhasil') ? 'focus:ring-green-500' : 'focus:ring-red-500'
                      }`}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/30 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4 pb-20">
          <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">

            {/* Header - Fixed */}
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
                className="text-gray-400 hover:text-gray-600 transition-colors p-3 hover:bg-gray-100 rounded-full flex-shrink-0 ml-4"
                title="Tutup Modal"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Tab Navigation - Fixed */}
            <div className="border-b border-gray-200 flex-shrink-0">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Detail Submission
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'documents'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Dokumen Upload
                </button>
                <button
                  onClick={() => setActiveTab('approval')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'approval'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Status Approval
                </button>
              </nav>
            </div>

            {/* Tab Content - Scrollable with bottom padding */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-6 pb-8">{/* Extra padding bottom to ensure content doesn't get hidden */}

                {/* Tab 1: Details */}
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
                          <p className="mt-1 text-sm text-gray-900">{submission.pelaksanaan || 'Belum diisi'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Jam Kerja</label>
                          <p className="mt-1 text-sm text-gray-900">{submission.jam_kerja}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nama Pekerja</label>
                          <div className="mt-1 text-sm text-gray-900">
                            {formatNamaPekerjaDisplay(submission.nama_pekerja).length > 0 ? (
                              <div className="space-y-1">
                                {formatNamaPekerjaDisplay(submission.nama_pekerja).map((nama, index) => (
                                  <div key={index} className="flex items-start">
                                    <span className="text-gray-500 mr-2 min-w-[1.5rem]">{index + 1}.</span>
                                    <span>{nama}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
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
                        {/* Nomor SIMLOK - hanya muncul jika sudah APPROVED */}
                        {submission.status_approval_admin === 'APPROVED' && submission.nomor_simlok && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Nomor SIMLOK</label>
                            <p className="mt-1 text-sm text-gray-900">{submission.nomor_simlok}</p>
                          </div>
                        )}
                        {submission.status_approval_admin === 'APPROVED' && submission.tanggal_simlok && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Tanggal SIMLOK</label>
                            <p className="mt-1 text-sm text-gray-900">{formatDate(submission.tanggal_simlok)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Informasi Penandatangan */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Informasi Penandatangan</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Jabatan Penandatangan</label>
                          <p className="mt-1 text-sm text-gray-900">{submission.jabatan_signer || '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nama Penandatangan</label>
                          <p className="mt-1 text-sm text-gray-900">{submission.nama_signer}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Documents */}
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
                              title="Buka preview di tab baru"
                            >
                              <EyeIcon className="h-4 w-4 mr-2" />
                              Preview
                              <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
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
                              title="Buka preview di tab baru"
                            >
                              <EyeIcon className="h-4 w-4 mr-2" />
                              Preview
                              <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
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
                              title="Buka preview di tab baru"
                            >
                              <EyeIcon className="h-4 w-4 mr-2" />
                              Preview
                              <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
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

                {/* Tab 3: Approval */}
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
                            <div className="mt-1 text-sm text-gray-900 space-y-1">
                              {formatTembusanDisplay(submission.tembusan).map((item, index) => (
                                <div key={index} className="flex items-center">
                                  <span className="w-4 text-gray-600">{index + 1}.</span>
                                  <span className="ml-2">{item}</span>
                                </div>
                              ))}
                            </div>
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
                                  onChange={(e) => {
                                    setApprovalForm(prev => ({ ...prev, nomor_simlok: e.target.value }));
                                    clearFieldError('nomor_simlok');
                                  }}
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-all duration-200 ${validationErrors.nomor_simlok
                                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500 shake'
                                      : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                                    }`}
                                  placeholder="Contoh: SIMLOK/2024/001"
                                />
                                {validationErrors.nomor_simlok && (
                                  <p className="mt-1 text-sm text-red-600 animate-pulse">{validationErrors.nomor_simlok}</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Tanggal SIMLOK <span className="text-red-500">*</span>
                                </label>
                                <DatePicker
                                  value={approvalForm.tanggal_simlok}
                                  onChange={(value) => setApprovalForm(prev => ({ ...prev, tanggal_simlok: value }))}
                                  placeholder="Pilih tanggal SIMLOK"
                                  required
                                />
                              </div>
                            </>
                          )}

                          {/* Fields khusus untuk APPROVED */}
                          {approvalForm.status === 'APPROVED' && (
                            <>
                              {/* Pelaksanaan - Admin mengisi */}
                              <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">
                                  Pelaksanaan <span className="text-red-500">*</span>
                                  <span className="text-xs text-gray-500 ml-1">(Jadwal pelaksanaan kegiatan)</span>
                                </label>

                            {/* Template Helper untuk Pelaksanaan */}
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs text-blue-700 mb-1">Tanggal Dari:</label>
                                  <DatePicker
                                    value={templateFields.tanggal_dari}
                                    onChange={(value) => setTemplateFields(prev => ({ ...prev, tanggal_dari: value }))}
                                    placeholder="Pilih tanggal mulai"
                                    className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-blue-700 mb-1">Tanggal Sampai:</label>
                                  <DatePicker
                                    value={templateFields.tanggal_sampai}
                                    onChange={(value) => setTemplateFields(prev => ({ ...prev, tanggal_sampai: value }))}
                                    placeholder="Pilih tanggal selesai"
                                    className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </div>

                            </div>

                            <textarea
                              value={approvalForm.pelaksanaan}
                              onChange={(e) => {
                                setApprovalForm(prev => ({ ...prev, pelaksanaan: e.target.value }));
                                clearFieldError('pelaksanaan');
                              }}
                              rows={3}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-all duration-200 ${validationErrors.pelaksanaan
                                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500 shake'
                                  : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                                }`}
                              placeholder="Contoh: Terhitung mulai tanggal 15 Januari 2024 sampai 20 Januari 2024. Termasuk hari Sabtu, Minggu dan hari libur lainnya."
                            />
                            {validationErrors.pelaksanaan && (
                              <p className="mt-1 text-sm text-red-600 animate-pulse">{validationErrors.pelaksanaan}</p>
                            )}
                          </div>
 {/* Jabatan Signer - Admin mengisi */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Jabatan Penandatangan
                              <span className="text-xs text-gray-500 ml-1">(Jabatan yang menandatangani dokumen)</span>
                            </label>
                            <input
                              type="text"
                              value={approvalForm.jabatan_signer}
                              onChange={(e) => setApprovalForm(prev => ({ ...prev, jabatan_signer: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Contoh: Head Of Security Region I, Manager Operations, dll"
                            />
                          </div>

                          {/* Nama Signer - Admin mengisi */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nama Penandatangan
                              <span className="text-xs text-gray-500 ml-1">(Nama yang menandatangani dokumen)</span>
                            </label>
                            <input
                              type="text"
                              value={approvalForm.nama_signer}
                              onChange={(e) => setApprovalForm(prev => ({ ...prev, nama_signer: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Masukkan nama penandatangan"
                            />
                          </div>

                          {/* Lain-lain - Admin mengisi */}
                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">
                              Lain-lain
                              <span className="text-xs text-gray-500 ml-1">(Catatan tambahan)</span>
                            </label>

                            {/* Template Helper untuk Lain-lain */}
                            <div className="bg-green-50 p-3 rounded-md border border-green-200">
                              <div className="space-y-2 mb-2">
                                <div className="text-xs text-green-600">
                                  <p><strong>SIMJA:</strong> {submission.nomor_simja || 'Tidak ada'} - {submission.tanggal_simja ? formatDate(submission.tanggal_simja) : 'Tidak ada'}</p>
                                  <p><strong>SIKA:</strong> {submission.nomor_sika || 'Tidak ada'} - {submission.tanggal_sika ? formatDate(submission.tanggal_sika) : 'Tidak ada'}</p>
                                </div>
                                <div>
                                  <label className="block text-xs text-green-700 mb-1">Tanggal Diterima Head of Security:</label>
                                  <DatePicker
                                    value={templateFields.tanggal_diterima_security}
                                    onChange={(value) => setTemplateFields(prev => ({ ...prev, tanggal_diterima_security: value }))}
                                    placeholder="Pilih tanggal diterima"
                                    className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                  />
                                </div>
                              </div>

                            </div>

                            <textarea
                              value={approvalForm.lain_lain}
                              onChange={(e) => setApprovalForm(prev => ({ ...prev, lain_lain: e.target.value }))}
                              rows={6}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Izin diberikan berdasarkan:&#10;• Simja Ast Man Facility Management&#10;  [nomor] Tgl. [tanggal]&#10;• SIKA Pekerjaan Dingin&#10;  [nomor] Tgl. [tanggal]&#10;  Diterima Head Of Security Region 1&#10;  [tanggal]"
                            />
                          </div>

                          {/* Content - Admin mengisi */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Content
                              <span className="text-xs text-gray-500 ml-1">(Isi surat izin masuk lokasi)</span>
                            </label>
                            <textarea
                              value={approvalForm.content}
                              onChange={(e) => setApprovalForm(prev => ({ ...prev, content: e.target.value }))}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis."
                            />
                          </div>

                         
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tembusan <span className="text-red-500">*</span>
                              <span className="text-xs text-gray-500 ml-1">(Wajib diisi)</span>
                            </label>
                            <textarea
                              value={approvalForm.tembusan}
                              onChange={(e) => {
                                setApprovalForm(prev => ({ ...prev, tembusan: e.target.value }));
                                clearFieldError('tembusan');
                              }}
                              rows={3}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-all duration-200 ${validationErrors.tembusan
                                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500 shake'
                                  : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                                }`}
                              placeholder="Masukkan tembusan (pisahkan dengan enter atau koma)&#10;Contoh:&#10;Kepala Bagian&#10;Manager&#10;atau: Kepala Bagian, Manager, Koordinator"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                              Tip: Pisahkan tembusan dengan enter atau koma. Akan ditampilkan satu item per baris.
                            </p>
                            {approvalForm.tembusan && (
                              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                                <p className="text-sm text-green-700 font-medium mb-2">Preview tampilan:</p>
                                <div className="text-sm text-green-800 space-y-1">
                                  {formatTembusanDisplay(approvalForm.tembusan).map((item, index) => (
                                    <div key={index} className="flex items-center">
                                      <span className="w-4 text-green-600">{index + 1}.</span>
                                      <span className="ml-2">{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {validationErrors.tembusan && (
                              <p className="mt-1 text-sm text-red-600 animate-pulse">{validationErrors.tembusan}</p>
                            )}
                          </div>
                            </>
                          )}

                          {/* Keterangan - selalu tampil untuk APPROVED dan REJECTED */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Keterangan <span className="text-red-500">*</span>
                              <span className="text-xs text-gray-500 ml-1">(Wajib diisi)</span>
                            </label>
                            <textarea
                              value={approvalForm.keterangan}
                              onChange={(e) => {
                                setApprovalForm(prev => ({ ...prev, keterangan: e.target.value }));
                                clearFieldError('keterangan');
                              }}
                              rows={3}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-all duration-200 ${validationErrors.keterangan
                                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500 shake'
                                  : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                                }`}
                              placeholder={
                                approvalForm.status === 'APPROVED'
                                  ? "Tambahkan catatan approval..."
                                  : "Alasan penolakan..."
                              }
                            />
                            {validationErrors.keterangan && (
                              <p className="mt-1 text-sm text-red-600 animate-pulse">{validationErrors.keterangan}</p>
                            )}
                          </div>

                          <div className="pt-4">
                            <button
                              onClick={handleApprovalSubmit}
                              disabled={isProcessing}
                              className={`w-full font-medium py-3 px-4 rounded-md transition-colors ${approvalForm.status === 'APPROVED'
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
                                  <li>Pelaksanaan, Keterangan, dan Tembusan wajib diisi</li>
                                </>
                              ) : (
                                <>
                                  <li>Pelaksanaan, Keterangan, dan Tembusan wajib diisi</li>
                                  <li>Jelaskan alasan penolakan secara detail di keterangan</li>
                                </>
                              )}
                              <li>Semua field bertanda * wajib diisi</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Document Actions if approved */}
                  </div>
                )}

              </div>
            </div>

            {/* Footer - Always visible with better positioning */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-white flex-shrink-0 sticky bottom-0 z-10 shadow-lg">
              
              {/* Tombol PDF - hanya muncul jika sudah APPROVED */}
              <div className="flex items-center space-x-3">
                {submission.status_approval_admin === 'APPROVED' && (
                  <button
                    onClick={handleViewPDF}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 hover:border-blue-700 transition-colors"
                    title="Lihat PDF SIMLOK"
                  >
                    <DocumentIcon className="h-4 w-4 mr-2" />
                    Lihat PDF
                  </button>
                )}
              </div>

              <div className="flex-1"></div>
              
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-white bg-gray-600 border border-gray-600 rounded-md hover:bg-gray-700 hover:border-gray-700 transition-colors flex-shrink-0"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SIMLOK PDF Modal */}
      <SimlokPdfModal
        isOpen={simlokPdfModal.isOpen}
        onClose={handleCloseSilmokPdf}
        submissionId={submission.id}
        submissionName={submission.nama_vendor}
        nomorSimlok={submission.nomor_simlok}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={handleClosePreview}
        fileUrl={previewModal.fileUrl}
        fileName={previewModal.fileName}
      />
    </>
  );
}
