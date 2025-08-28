'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, EyeIcon, DocumentIcon, ArrowDownTrayIcon, PhotoIcon, BuildingOfficeIcon, UserIcon, BriefcaseIcon, CalendarIcon, ClockIcon, WrenchScrewdriverIcon, CheckCircleIcon, XCircleIcon, ClockIcon as PendingIcon } from '@heroicons/react/24/outline';
import { fileUrlHelper } from '@/lib/fileUrlHelper';
import DatePicker from '@/components/form/DatePicker';
import DocumentPreviewModal from '@/components/common/DocumentPreviewModal';
import SimlokPdfModal from '@/components/common/SimlokPdfModal';
import WorkersList from '@/components/common/WorkersList';
import DetailSection from '@/components/common/DetailSection';
import InfoCard from '@/components/common/InfoCard';
import Alert from '@/components/ui/alert/Alert';
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
    // tembusan: ''
  });
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [approvalForm, setApprovalForm] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED',
    keterangan: '',
    // tembusan: '',
    nomor_simlok: '',
    tanggal_simlok: '',
    pelaksanaan: '',
    lain_lain: '',
    content: '',
    jabatan_signer: 'Hend Or Secunty Region I',
    nama_signer: 'Julianto Santoso'
  });

  // Template helper fields (tidak disimpan ke database)
  const [templateFields, setTemplateFields] = useState({
    tanggal_dari: '',
    tanggal_sampai: '',
    tanggal_simlok: submission?.tanggal_simlok || '',
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

  // Format date function - defined before useEffect to avoid hoisting issues
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

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
            const todayYear = today.getFullYear();
            const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
            const todayDay = String(today.getDate()).padStart(2, '0');
            return `${todayYear}-${todayMonth}-${todayDay}`;
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
          // tembusan: submission.tembusan || '',
          nomor_simlok: submission.nomor_simlok || '',
          tanggal_simlok: formatDateForInput(submission.tanggal_simlok),
          pelaksanaan: submission.pelaksanaan || '',
          lain_lain: submission.lain_lain || '',
          content: submission.content || 'Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis.',
          jabatan_signer: submission.jabatan_signer || 'Hend Or Secunty Region I',
          nama_signer: submission.nama_signer || 'Julianto Santoso'
        });

        // Reset template fields
        setTemplateFields({
          tanggal_dari: '',
          tanggal_sampai: '',
          tanggal_simlok: submission?.tanggal_simlok || '',
        });

        // Reset validation errors
        setValidationErrors({
          nomor_simlok: '',
          pelaksanaan: '',
          keterangan: '',
          // tembusan: ''
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
      const tanggalDiterima = approvalForm.tanggal_simlok;
      if (tanggalDiterima) {
        templateParts.push(
          ` \n`,
          ` Diterima ${submission?.jabatan_signer || approvalForm.jabatan_signer || '[Jabatan akan diisi saat approval]'}`,
          `  ${formatDate(tanggalDiterima)}`
        );
      }
      
      return templateParts.join('\n');
    };

    // Update template jika ada data yang diperlukan
    const shouldUpdate = approvalForm.tanggal_simlok ||
                        (submission?.nomor_simja && submission?.nomor_sika);
    
    if (shouldUpdate) {
      const newTemplate = generateLainLainTemplate();
      setApprovalForm(prev => ({ ...prev, lain_lain: newTemplate }));
    }
  }, [approvalForm.tanggal_simlok, submission?.nomor_simja, submission?.tanggal_simja, submission?.nomor_sika, submission?.tanggal_sika, submission?.jabatan_signer, approvalForm.jabatan_signer]);

  if (!isOpen || !submission) return null;

  // Function to format and display nama pekerja as list
  const formatNamaPekerjaDisplay = (namaPekerja: string) => {
    if (!namaPekerja) return [];
    return namaPekerja
      .split(/[\n,]+/) // Split by newlines or commas
      .map(nama => nama.trim())
      .filter(nama => nama.length > 0);
  };

  // Function to format and display tembusan as list
  // const formatTembusanDisplay = (tembusan: string) => {
  //   if (!tembusan) return [];
  //   return tembusan
  //     .split(/[\n,]+/) // Split by newlines or commas
  //     .map(item => item.trim())
  //     .filter(item => item.length > 0);
  // };

 
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

    // Validasi untuk approve: harus ada nomor SIMLOK
    if (approvalForm.status === 'APPROVED' && !approvalForm.nomor_simlok.trim()) {
      errors.nomor_simlok = 'Nomor SIMLOK harus diisi untuk menyetujui submission';
      hasErrors = true;
    }

    // Validasi pelaksanaan wajib diisi HANYA untuk APPROVED
    if (approvalForm.status === 'APPROVED' && !approvalForm.pelaksanaan.trim()) {
      errors.pelaksanaan = 'Pelaksanaan harus diisi untuk menyetujui submission';
      hasErrors = true;
    }

    // Validasi keterangan wajib diisi untuk semua status
    if (!approvalForm.keterangan.trim()) {
      errors.keterangan = 'Keterangan harus diisi';
      hasErrors = true;
    }

    // Validasi tembusan wajib diisi
    // if (!approvalForm.tembusan.trim()) {
    //   errors.tembusan = 'Tembusan harus diisi';
    //   hasErrors = true;
    // }

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
        // tembusan: approvalForm.tembusan,
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
        {/* Alert Notification */}
        {showErrorAlert && (
          <div className="fixed top-4 right-4 z-[100] max-w-md animate-bounce">
            <Alert
              variant={errorMessage.includes('berhasil') ? 'success' : 'error'}
              title={errorMessage.includes('berhasil') ? 'Berhasil!' : 'Validasi Error'}
              message={errorMessage}
            />
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
                    <DetailSection 
                      title="Informasi Vendor" 
                      icon={<BuildingOfficeIcon className="h-5 w-5 text-blue-500" />}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoCard
                          label="Nama Vendor"
                          value={submission.nama_vendor}
                        />
                        <InfoCard
                          label="Nama Petugas"
                          value={submission.nama_petugas}
                          icon={<UserIcon className="h-4 w-4 text-gray-500" />}
                        />
                        <InfoCard
                          label="Email"
                          value={submission.user.email}
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
                    </DetailSection>

                    {/* Daftar Pekerja */}
                    <DetailSection 
                      title="Daftar Pekerja" 
                      icon={<UserIcon className="h-5 w-5 text-purple-500" />}
                    >
                      <WorkersList
                        submissionId={submission.id}
                        fallbackWorkers={submission.nama_pekerja}
                        layout="grid"
                        showPhotos={true}
                        maxDisplayCount={6}
                      />
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
                        {/* Nomor SIMLOK - hanya muncul jika sudah APPROVED */}
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

                    {/* Informasi Penandatangan */}
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

                    {/* Dokumen Upload dalam Detail */}
                    <DetailSection 
                      title="Dokumen Upload" 
                      icon={<DocumentIcon className="h-5 w-5 text-blue-500" />}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Dokumen SIKA */}
                        {submission.upload_doc_sika && (
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <DocumentIcon className="h-5 w-5 text-blue-500" />
                                <div>
                                  <h4 className="font-medium text-gray-900">Dokumen SIKA</h4>
                                  <p className="text-xs text-gray-500">Surat Izin Kerja Aman</p>
                                </div>
                              </div>
                              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                Tersedia
                              </span>
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
                          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <DocumentIcon className="h-5 w-5 text-green-500" />
                                <div>
                                  <h4 className="font-medium text-gray-900">Dokumen SIMJA</h4>
                                  <p className="text-xs text-gray-500">Surat Izin Masuk Area</p>
                                </div>
                              </div>
                              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                Tersedia
                              </span>
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
                  </div>
                )}

                {/* Tab 2: Approval */}
                {activeTab === 'approval' && (
                  <div className="space-y-6">
                    {/* Status Saat Ini */}
                    <DetailSection 
                      title="Status Approval" 
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                              <div className="whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                                {submission.keterangan}
                              </div>
                            }
                            className="md:col-span-2"
                          />
                        )}
                      </div>
                    </DetailSection>

                    {/* Approval Form - Only show if status is PENDING */}
                    {submission.status_approval_admin === 'PENDING' && (
                      <DetailSection 
                        title="Proses Approval" 
                        icon={<DocumentIcon className="h-5 w-5 text-blue-500" />}
                      >
                        <div className="space-y-6">
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

                         
                          {/* <div>
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
                          </div> */}
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
                            <Button
                              onClick={handleApprovalSubmit}
                              disabled={isProcessing}
                              variant={approvalForm.status === 'APPROVED' ? 'primary' : 'destructive'}
                              size="md"
                              className="w-full"
                            >
                              {isProcessing ? 'Memproses...' : 'Simpan Perubahan'}
                            </Button>
                          </div>

                          {/* Validation hints */}
                          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
                            <p className="font-medium mb-1">Catatan:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {approvalForm.status === 'APPROVED' ? (
                                <>
                                  <li>Nomor SIMLOK dan Tanggal SIMLOK wajib diisi</li>
                                  <li>Pelaksanaan dan Keterangan wajib diisi</li>
                                </>
                              ) : (
                                <>
                                  <li>Hanya Keterangan yang wajib diisi</li>
                                  <li>Jelaskan alasan penolakan secara detail di keterangan</li>
                                </>
                              )}
                              <li>Semua field bertanda * wajib diisi</li>
                            </ul>
                          </div>
                        </div>
                      </DetailSection>
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
                  <Button
                    onClick={handleViewPDF}
                    variant="primary"
                    size="sm"
                    className="flex items-center"
                    title="Lihat PDF SIMLOK"
                  >
                    <DocumentIcon className="h-4 w-4 mr-2" />
                    Lihat PDF
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
