'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, EyeIcon, DocumentIcon, BuildingOfficeIcon, UserIcon, BriefcaseIcon, CalendarIcon, CheckCircleIcon, XCircleIcon, ClockIcon as PendingIcon } from '@heroicons/react/24/outline';
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
  approval_status: string;
  vendor_name: string;
  based_on: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation: string | null;
  working_hours: string;
  other_notes?: string;
  work_facilities: string;
  // tembusan?: string;
  simja_number?: string;
  simja_date?: string | null;
  sika_number?: string;
  sika_date?: string | null;
  simlok_number?: string;
  simlok_date?: string | null;
  implementation_start_date?: string | null;
  implementation_end_date?: string | null;
  worker_names: string;
  content: string;
  notes?: string;
  implementation_notes?: string;
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
    tanggal_simlok: submission?.simlok_date || '',
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
          keterangan: submission.other_notes || '',
          // tembusan: submission.tembusan || '',
          tanggal_simlok: formatDateForInput(submission.simlok_date),
          pelaksanaan: submission.implementation || '',
          lain_lain: submission.other_notes || '',
          content: submission.content || 'Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis.',
          jabatan_signer: submission.signer_position || 'Hend Or Secunty Region I',
          nama_signer: submission.signer_name || 'Julianto Santoso'
        });

        // Reset template fields
        setTemplateFields({
          tanggal_dari: submission.implementation_start_date ? formatDateForInput(submission.implementation_start_date) : '',
          tanggal_sampai: submission.implementation_end_date ? formatDateForInput(submission.implementation_end_date) : '',
          tanggal_simlok: submission?.simlok_date || '',
        });

        // Reset validation errors
        setValidationErrors({
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
      if (submission?.simja_number && submission?.simja_date) {
        templateParts.push(
          `• Simja Ast Man Facility Management`,
          `  ${submission.simja_number} Tgl. ${formatDate(submission.simja_date)}`
        );
      }
      
      // SIKA section  
      if (submission?.sika_number && submission?.sika_date) {
        templateParts.push(
          `• SIKA Pekerjaan Dingin`,
          `  ${submission.sika_number} Tgl. ${formatDate(submission.sika_date)}`
        );
      }
      
      // Head of Security section
      const tanggalDiterima = approvalForm.tanggal_simlok;
      if (tanggalDiterima) {
        templateParts.push(
          ` \n`,
          ` Diterima ${submission?.signer_position || approvalForm.jabatan_signer || '[Jabatan akan diisi saat approval]'}`,
          `  ${formatDate(tanggalDiterima)}`
        );
      }
      
      return templateParts.join('\n');
    };

    // Update template jika ada data yang diperlukan
    const shouldUpdate = approvalForm.tanggal_simlok ||
                        (submission?.simja_number && submission?.sika_number);
    
    if (shouldUpdate) {
      const newTemplate = generateLainLainTemplate();
      setApprovalForm(prev => ({ ...prev, lain_lain: newTemplate }));
    }
  }, [approvalForm.tanggal_simlok, submission?.simja_number, submission?.simja_date, submission?.sika_number, submission?.sika_date, submission?.signer_position, approvalForm.jabatan_signer]);

  if (!isOpen || !submission) return null;

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
      PENDING: { label: 'Menunggu Review', className: 'bg-yellow-100 text-yellow-800' },
      APPROVED: { label: 'Disetujui', className: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Ditolak', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
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

  const validateForm = () => {
    const errors = {
      pelaksanaan: '',
      keterangan: '',
      tembusan: ''
    };

    let hasErrors = false;

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
        pelaksanaan: approvalForm.pelaksanaan,
        lain_lain: approvalForm.lain_lain,
        content: approvalForm.content,
        jabatan_signer: approvalForm.jabatan_signer,
        nama_signer: approvalForm.nama_signer,
      };

      // Hanya tambahkan tanggal jika di-approve (nomor akan auto-generate)
      if (approvalForm.status === 'APPROVED') {
        requestBody.tanggal_simlok = approvalForm.tanggal_simlok;
        
        // Tambahkan tanggal pelaksanaan dari - sampai
        if (templateFields.tanggal_dari) {
          requestBody.implementation_start_date = templateFields.tanggal_dari;
        }
        if (templateFields.tanggal_sampai) {
          requestBody.implementation_end_date = templateFields.tanggal_sampai;
        }
      }

      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.code === 'INVALID_SESSION') {
          throw new Error('Your session has expired. Please refresh the page and log in again.');
        }
        
        throw new Error(errorData.error || 'Failed to update submission');
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
                  Detail Submission - {submission.vendor_name}
                </h2>
                <div className="flex items-center space-x-4 mt-2">
                  {getStatusBadge(submission.approval_status)}
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
                          value={submission.vendor_name}
                        />
                        <InfoCard
                          label="Nama Petugas"
                          value={submission.officer_name}
                          icon={<UserIcon className="h-4 w-4 text-gray-500" />}
                        />
                        <InfoCard
                          label="Email"
                          value={submission.user.email}
                        />
                        <InfoCard
                          label="Berdasarkan"
                          value={submission.based_on}
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
                          value={submission.job_description}
                        />
                        <InfoCard
                          label="Lokasi Kerja"
                          value={submission.work_location}
                        />
                        <InfoCard
                          label="Pelaksanaan"
                          value={submission.implementation || 'Belum diisi'}
                        />
                        <InfoCard
                          label="Jam Kerja"
                          value={submission.working_hours}
                        />
                        <InfoCard
                          label="Sarana Kerja"
                          value={submission.work_facilities}
                          className="md:col-span-2"
                        />
                      </div>

                      {submission.other_notes && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <InfoCard
                            label="Lain-lain"
                            value={
                              <div className="whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                                {submission.other_notes}
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
                        fallbackWorkers={submission.worker_names}
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
                        {/* Nomor SIMLOK - hanya muncul jika sudah APPROVED */}
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
                        {submission.approval_status === 'APPROVED' && submission.implementation_start_date && (
                          <InfoCard
                            label="Tanggal Mulai Pelaksanaan"
                            value={formatDate(submission.implementation_start_date)}
                            icon={<CalendarIcon className="h-4 w-4 text-gray-500" />}
                          />
                        )}
                        {submission.approval_status === 'APPROVED' && submission.implementation_end_date && (
                          <InfoCard
                            label="Tanggal Selesai Pelaksanaan"
                            value={formatDate(submission.implementation_end_date)}
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
                          value={submission.signer_position || '-'}
                        />
                        <InfoCard
                          label="Nama Penandatangan"
                          value={submission.signer_name || '-'}
                        />
                      </div>
                    </DetailSection>

                    {/* Dokumen Upload dalam Detail */}
                    <DetailSection 
                      title="Dokumen Upload" 
                      icon={<DocumentIcon className="h-5 w-5 text-blue-500" />}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Dokumen SIKA */}
                        {submission.sika_document_upload && (
                          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="flex items-center space-x-3">
                              <DocumentIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-gray-900">Dokumen SIKA</p>
                                <p className="text-sm text-gray-500">File tersedia</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleFileView(submission.sika_document_upload!, 'Dokumen SIKA')}
                              className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <EyeIcon className="w-4 h-4" />
                              <span>Lihat</span>
                            </button>
                          </div>
                        )}

                        {/* Dokumen SIMJA */}
                        {submission.simja_document_upload && (
                          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="flex items-center space-x-3">
                              <DocumentIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-gray-900">Dokumen SIMJA</p>
                                <p className="text-sm text-gray-500">File tersedia</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleFileView(submission.simja_document_upload!, 'Dokumen SIMJA')}
                              className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <EyeIcon className="w-4 h-4" />
                              <span>Lihat</span>
                            </button>
                          </div>
                        )}

                        {/* Message if no documents */}
                        {!submission.sika_document_upload && !submission.simja_document_upload && (
                          <div className="col-span-2 text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
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
                        submission.approval_status === 'APPROVED' ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : submission.approval_status === 'REJECTED' ? (
                          <XCircleIcon className="h-5 w-5 text-red-500" />
                        ) : (
                          <PendingIcon className="h-5 w-5 text-yellow-500" />
                        )
                      }
                      badge={getStatusBadge(submission.approval_status)}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoCard
                          label="Status Saat Ini"
                          value={getStatusBadge(submission.approval_status)}
                        />
                        {submission.approved_by_user && (
                          <InfoCard
                            label="Disetujui Oleh"
                            value={submission.approved_by_user.officer_name}
                            icon={<UserIcon className="h-4 w-4 text-gray-500" />}
                          />
                        )}
                        {submission.notes && (
                          <InfoCard
                            label="Keterangan"
                            value={
                              <div className="whitespace-pre-wrap text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                                {submission.notes}
                              </div>
                            }
                            className="md:col-span-2"
                          />
                        )}
                      </div>
                    </DetailSection>

                    {/* Approval Form - Only show if status is PENDING */}
                    {submission.approval_status === 'PENDING' && (
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
                              {/* Tanggal Pelaksanaan - Admin mengisi */}
                          <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700">
                              Tanggal Pelaksanaan <span className="text-red-500">*</span>
                              <span className="text-xs text-gray-500 ml-1">(Jadwal pelaksanaan kegiatan)</span>
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm text-gray-600 mb-2">Tanggal Mulai:</label>
                                <DatePicker
                                  value={templateFields.tanggal_dari}
                                  onChange={(value) => setTemplateFields(prev => ({ ...prev, tanggal_dari: value }))}
                                  placeholder="Pilih tanggal mulai"
                                  className="w-full"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-600 mb-2">Tanggal Selesai:</label>
                                <DatePicker
                                  value={templateFields.tanggal_sampai}
                                  onChange={(value) => setTemplateFields(prev => ({ ...prev, tanggal_sampai: value }))}
                                  placeholder="Pilih tanggal selesai"
                                  className="w-full"
                                />
                              </div>
                            </div>

                            {/* Keterangan Pelaksanaan */}
                            <div>
                              <label className="block text-sm text-gray-600 mb-2">Keterangan Pelaksanaan:</label>
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
                                  <li>Nomor SIMLOK akan dibuat otomatis saat di-approve</li>
                                  <li>Tanggal SIMLOK, Pelaksanaan dan Keterangan wajib diisi</li>
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
                {submission.approval_status === 'APPROVED' && (
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
        submissionName={submission.vendor_name}
        nomorSimlok={submission.simlok_number || ''}
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
