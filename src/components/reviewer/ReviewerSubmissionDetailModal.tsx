'use client';

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  QrCodeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import DatePicker from '@/components/form/DatePicker';
import DateRangePicker from '@/components/form/DateRangePicker';
import SimlokPdfModal from '@/components/common/SimlokPdfModal';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { useImplementationDates } from '@/hooks/useImplementationDates';

interface WorkerPhoto {
  id: string;
  worker_name: string;
  worker_photo: string;
  created_at: string;
}

interface QrScan {
  id: string;
  scanned_at: string;
  scanner_name?: string;
  notes?: string;
  user: {
    id: string;
    officer_name: string;
    email: string;
    role: string;
  };
}

interface ScanHistory {
  scans: QrScan[];
  totalScans: number;
  lastScan: QrScan | null;
  hasBeenScanned: boolean;
}

interface SubmissionDetail {
  id: string;
  vendor_name: string;
  vendor_phone?: string;
  based_on: string;
  officer_name: string;
  officer_email?: string;
  job_description: string;
  work_location: string;
  implementation: string;
  working_hours: string;
  other_notes: string;
  work_facilities: string;
  worker_count: number | null;
  simja_number: string;
  simja_date: string | null;
  sika_number: string;
  sika_date: string | null;
  simlok_number: string | null;
  simlok_date: string | null;
  implementation_start_date: string | null;
  implementation_end_date: string | null;
  worker_names: string;
  content: string;
  notes: string;
  vendor_note: string | null;
  signer_position: string;
  signer_name: string;
  review_status: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
  review_note: string;
  reviewed_by_name?: string;
  reviewed_by_email?: string;
  final_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  final_note: string;
  approved_by_name?: string;
  approved_by_email?: string;
  created_at: string;
  reviewed_at: string;
  approved_at: string;
  worker_list: WorkerPhoto[];
}

interface ReviewerSubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  onReviewSubmitted: () => void;
}

const ReviewerSubmissionDetailModal: React.FC<ReviewerSubmissionDetailModalProps> = ({
  isOpen,
  onClose,
  submissionId,
  onReviewSubmitted
}) => {
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'workers' | 'review'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingWorkers, setIsEditingWorkers] = useState(false);
  const [hasWorkerChanges, setHasWorkerChanges] = useState(false);
  const [workersToDelete, setWorkersToDelete] = useState<string[]>([]);
  const [originalWorkerList, setOriginalWorkerList] = useState<WorkerPhoto[]>([]);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistory | null>(null);
  const [loadingScanHistory, setLoadingScanHistory] = useState(false);
  // Removed unused deletingWorker state since we now use deferred deletion
  const { showSuccess, showError } = useToast();

  // Form state for editing
  const [formData, setFormData] = useState({
    vendor_name: '',
    vendor_phone: '',
    based_on: '',
    officer_name: '',
    job_description: '',
    work_location: '',
    implementation: '',
    working_hours: '',
    other_notes: '',
    work_facilities: '',
    worker_count: 0,
    simja_number: '',
    simja_date: '',
    sika_number: '',
    sika_date: '',
    implementation_start_date: '',
    implementation_end_date: '',
    worker_names: '',
    content: '',
  });

  // Review form state
  const [reviewData, setReviewData] = useState({
    review_status: '' as 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS' | '',
    review_note: ''
  });

  // Approval form state for admin-like inputs (tanpa status keputusan)
  const [approvalForm, setApprovalForm] = useState({
    vendor_note: '', // Catatan khusus ke vendor
    tanggal_simlok: '',
    pelaksanaan: '',
    lain_lain: '', // Template lain-lain untuk approval
    content: '',
    jabatan_signer: 'Sr Officer Security III',
    nama_signer: 'Julianto Santoso'
  });

  // Implementation dates hook untuk handle logika tanggal dengan lebih robust
  const implementationDates = useImplementationDates({
    simjaNumber: submission?.simja_number || undefined,
    simjaDate: submission?.simja_date || undefined,
    sikaNumber: submission?.sika_number || undefined,
    sikaDate: submission?.sika_date || undefined,
    signerPosition: approvalForm.jabatan_signer,
    initialDates: {
      startDate: formData.implementation_start_date,
      endDate: formData.implementation_end_date
    }
  });

  const fetchSubmissionDetail = async () => {
    if (!submissionId) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/reviewer/simloks/${submissionId}`);
      if (!response.ok) {
        throw new Error('Gagal mengambil detail pengajuan');
      }

      const data = await response.json();
      setSubmission(data.submission);

      // Save original worker list for cancel functionality only if not in edit mode
      if (!isEditingWorkers) {
        setOriginalWorkerList(data.submission.worker_list || []);
      }

      // Debug log untuk melihat data submission
      console.log('Submission data received:', data.submission);
      console.log('Worker list:', data.submission.worker_list);
      if (data.submission.worker_list) {
        data.submission.worker_list.forEach((worker: WorkerPhoto, index: number) => {
          console.log(`Worker ${index + 1}:`, {
            name: worker.worker_name,
            photo: worker.worker_photo,
            hasPhoto: !!worker.worker_photo,
            photoLength: worker.worker_photo ? worker.worker_photo.length : 0
          });
        });
      }

      // Initialize form data with error handling
      const sub = data.submission;
      
      const safeDateConversion = (dateValue: string | null | undefined): string => {
        if (!dateValue) return '';
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return '';
          const isoString = date.toISOString();
          const datePart = isoString.split('T')[0];
          return datePart || '';
        } catch (error) {
          console.warn('Date conversion error:', error);
          return '';
        }
      };
      
      setFormData({
        vendor_name: sub.vendor_name || '',
        vendor_phone: sub.vendor_phone || '',
        based_on: sub.based_on || '',
        officer_name: sub.officer_name || '',
        job_description: sub.job_description || '',
        work_location: sub.work_location || '',
        implementation: sub.implementation || '',
        working_hours: sub.working_hours || '',
        other_notes: sub.other_notes || '',
        work_facilities: sub.work_facilities || '',
        worker_count: sub.worker_count || 0,
        simja_number: sub.simja_number || '',
        simja_date: safeDateConversion(sub.simja_date),
        sika_number: sub.sika_number || '',
        sika_date: safeDateConversion(sub.sika_date),
        implementation_start_date: safeDateConversion(sub.implementation_start_date),
        implementation_end_date: safeDateConversion(sub.implementation_end_date),
        worker_names: sub.worker_names || '',
        content: sub.content || '',
      });

      // Initialize review data
      setReviewData({
        review_status: sub.review_status === 'PENDING_REVIEW' ? '' : sub.review_status,
        review_note: sub.review_note || ''
      });

      // Initialize approval form data
      const formatDateForInput = (dateString: string | null | undefined): string => {
        try {
          if (!dateString) {
            const today = new Date();
            const todayYear = today.getFullYear();
            const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
            const todayDay = String(today.getDate()).padStart(2, '0');
            return `${todayYear}-${todayMonth}-${todayDay}`;
          }

          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            // Fallback to today if date is invalid
            const today = new Date();
            const todayYear = today.getFullYear();
            const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
            const todayDay = String(today.getDate()).padStart(2, '0');
            return `${todayYear}-${todayMonth}-${todayDay}`;
          }
          
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch (error) {
          console.warn('Error formatting date for input:', error);
          // Return today's date as fallback
          const today = new Date();
          const todayYear = today.getFullYear();
          const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
          const todayDay = String(today.getDate()).padStart(2, '0');
          return `${todayYear}-${todayMonth}-${todayDay}`;
        }
      };

      setApprovalForm({
        vendor_note: sub.vendor_note || '', // Catatan khusus ke vendor
        tanggal_simlok: formatDateForInput(sub.simlok_date),
        pelaksanaan: sub.implementation || '',
        lain_lain: sub.other_notes || '', // Template lain-lain untuk admin
        content: sub.content || 'Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis.',
        jabatan_signer: sub.signer_position || 'Sr Officer Security III',
        nama_signer: sub.signer_name || 'Julianto Santoso'
      });

      // Initialize implementation dates hook dengan data yang ada
      if (sub.implementation_start_date || sub.implementation_end_date) {
        implementationDates.updateDates({
          startDate: sub.implementation_start_date ? formatDateForInput(sub.implementation_start_date) : '',
          endDate: sub.implementation_end_date ? formatDateForInput(sub.implementation_end_date) : ''
        });
      }

    } catch (err) {
      console.error('Error fetching submission:', err);
      showError('Error', 'Gagal memuat detail pengajuan');
    } finally {
      setLoading(false);
    }
  };

  const fetchScanHistory = async () => {
    if (!submissionId) return;
    
    try {
      setLoadingScanHistory(true);
      const response = await fetch(`/api/submissions/${submissionId}/scans`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch scan history');
      }

      const data: ScanHistory = await response.json();
      setScanHistory(data);
    } catch (err) {
      console.error('Error fetching scan history:', err);
      // Don't show error for scan history as it's not critical
    } finally {
      setLoadingScanHistory(false);
    }
  };

  // Format date function with error handling
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '-';
      }
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      console.warn('Error formatting date:', error);
      return '-';
    }
  };

  useEffect(() => {
    if (isOpen && submissionId) {
      fetchSubmissionDetail();
      fetchScanHistory();
    }
  }, [isOpen, submissionId]);

  // Reset editing modes when modal closes or tab changes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setIsEditingWorkers(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsEditingWorkers(false);
  }, [activeTab]);

  // Update approval form ketika implementation dates berubah
  React.useEffect(() => {
    if (implementationDates.isValid) {
      setApprovalForm(prev => ({
        ...prev,
        pelaksanaan: implementationDates.template.pelaksanaan,
        lain_lain: implementationDates.template.lainLain
      }));
    }
  }, [implementationDates.isValid, implementationDates.template.pelaksanaan, implementationDates.template.lainLain]);

  // Sync form data dengan implementation dates hook
  React.useEffect(() => {
    if (submission && implementationDates.dates.startDate !== formData.implementation_start_date) {
      setFormData(prev => ({
        ...prev,
        implementation_start_date: implementationDates.dates.startDate,
        implementation_end_date: implementationDates.dates.endDate
      }));
    }
  }, [implementationDates.dates, formData.implementation_start_date, submission]);

  const handleViewPdf = () => {
    setIsPdfModalOpen(true);
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);

      // Gabungkan formData dengan approvalForm
      const implementationData = implementationDates.getData();
      const requestBody = {
        ...formData,
        // Tambahkan data approval form ke requestBody
        vendor_note: approvalForm.vendor_note, // Catatan khusus ke vendor
        other_notes: approvalForm.lain_lain, // Template lain-lain untuk admin
        content: approvalForm.content,
        signer_position: approvalForm.jabatan_signer,
        signer_name: approvalForm.nama_signer,
        implementation: implementationData.pelaksanaan,
        // Tambahkan tanggal pelaksanaan dari hook
        implementation_start_date: implementationData.startDate,
        implementation_end_date: implementationData.endDate,
      };

      const response = await fetch(`/api/reviewer/simloks/${submissionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal memperbarui pengajuan');
      }

      const data = await response.json();
      setSubmission(data.submission);
      showSuccess('Berhasil', 'Data berhasil diupdate');
      setIsEditing(false);

    } catch (err: any) {
      console.error('Error updating submission:', err);
      showError('Error', err.message || 'Gagal mengupdate data');
    } finally {
      setSaving(false);
    }
  };

  // Combined handler untuk review dan save approval template
  const handleSubmitReviewAndSave = async () => {
    if (!reviewData.review_status) {
      showError('Error', 'Pilih status review terlebih dahulu');
      return;
    }

    if (!reviewData.review_note.trim()) {
      showError('Error', 'Catatan review wajib diisi');
      return;
    }

    try {
      setSaving(true);

      // 1. Save approval template data first
      const implementationData = implementationDates.getData();
      const requestBody = {
        ...formData,
        vendor_note: approvalForm.vendor_note, // Catatan khusus ke vendor
        other_notes: approvalForm.lain_lain, // Template lain-lain untuk admin
        content: approvalForm.content,
        signer_position: approvalForm.jabatan_signer,
        signer_name: approvalForm.nama_signer,
        implementation: implementationData.pelaksanaan,
        implementation_start_date: implementationData.startDate,
        implementation_end_date: implementationData.endDate,
      };

      const saveResponse = await fetch(`/api/reviewer/simloks/${submissionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!saveResponse.ok) {
        throw new Error('Gagal menyimpan template approval');
      }

      // 2. Submit review
      const reviewResponse = await fetch(`/api/reviewer/simloks/${submissionId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      if (!reviewResponse.ok) {
        const errorData = await reviewResponse.json();
        throw new Error(errorData.error || 'Gagal mengirim review');
      }

      const data = await reviewResponse.json();
      setSubmission(data.submission);
      showSuccess('Berhasil', 'Review berhasil dikirim dan template approval tersimpan');
      onReviewSubmitted();

    } catch (err: any) {
      console.error('Error submitting review and saving template:', err);
      showError('Error', err.message || 'Gagal mengirim review');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorker = (workerId: string) => {
    if (!submission || !window.confirm('Apakah Anda yakin ingin menghapus foto pekerja ini?')) {
      return;
    }

    // Remove the worker from the local state only
    setSubmission(prevSubmission => {
      if (!prevSubmission) return null;
      return {
        ...prevSubmission,
        worker_list: prevSubmission.worker_list.filter(worker => worker.id !== workerId)
      };
    });

    // Add to deletion list
    setWorkersToDelete(prev => [...prev, workerId]);

    // Mark that there are changes
    setHasWorkerChanges(true);

    showSuccess('Berhasil', 'Foto pekerja akan dihapus setelah menyimpan perubahan');
  };

  const deleteWorkersFromDatabase = async () => {
    if (workersToDelete.length === 0) return;

    for (const workerId of workersToDelete) {
      try {
        const response = await fetch(`/api/reviewer/simloks/${submissionId}/workers/${workerId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Gagal menghapus foto pekerja');
        }
      } catch (err) {
        console.error('Error deleting worker:', err);
        throw err;
      }
    }
  };

  const handleSaveWorkerChanges = async () => {
    if (!hasWorkerChanges && workersToDelete.length === 0) {
      setIsEditingWorkers(false);
      return;
    }

    try {
      setSaving(true);

      // Delete workers from database first
      await deleteWorkersFromDatabase();

      // Call the regular save changes function for other worker data updates
      if (hasWorkerChanges) {
        await handleSaveChanges();
      }

      // Reset states
      setHasWorkerChanges(false);
      setIsEditingWorkers(false);
      setWorkersToDelete([]);
      setOriginalWorkerList([]);

    } catch (err: any) {
      console.error('Error saving worker changes:', err);
      showError('Error', err.message || 'Gagal menyimpan perubahan data pekerja');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelWorkerEdit = () => {
    if (hasWorkerChanges || workersToDelete.length > 0) {
      const confirmed = window.confirm('Ada perubahan yang belum disimpan. Apakah Anda yakin ingin membatalkan?');
      if (!confirmed) {
        return;
      }
    }

    // Restore original worker list if we have it
    if (originalWorkerList.length > 0 && submission) {
      setSubmission(prev => {
        if (prev) {
          return {
            ...prev,
            worker_list: [...originalWorkerList]
          };
        }
        return prev;
      });
    }

    // Reset all states
    setIsEditingWorkers(false);
    setHasWorkerChanges(false);
    setWorkersToDelete([]);
    setOriginalWorkerList([]);
  };

  const handleEditWorkerMode = () => {
    // Save original worker list for cancel functionality
    if (submission?.worker_list) {
      setOriginalWorkerList([...submission.worker_list]);
    }
    setIsEditingWorkers(true);
  };

  const canEdit = submission && submission.final_status === 'PENDING_APPROVAL';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <Badge variant="warning">Menunggu Review</Badge>;
      case 'MEETS_REQUIREMENTS':
        return <Badge variant="success">Memenuhi Syarat</Badge>;
      case 'NOT_MEETS_REQUIREMENTS':
        return <Badge variant="destructive">Tidak Memenuhi Syarat</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="warning">Menunggu Persetujuan</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Disetujui</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Detail & Review Pengajuan</h2>
            {submission && (
              <div className="text-sm text-gray-500 mt-1 space-y-1">
                <p>
                  <span className="font-medium">{submission.vendor_name}</span> - {submission.officer_name}
                </p>
                {submission.simlok_number && (
                  <p className="text-xs">
                    <span className="font-medium">No. SIMLOK:</span> {submission.simlok_number}
                    {submission.simlok_date && (
                      <span className="ml-2">• <span className="font-medium">Tanggal:</span> {formatDate(submission.simlok_date)}</span>
                    )}
                  </p>
                )}
                <p className="text-xs">
                  <span className="font-medium">ID Pengajuan:</span> {submission.id}
                </p>
                
                {/* Scan Status */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  {loadingScanHistory ? (
                    <div className="flex items-center text-xs text-gray-500">
                      <ClockIcon className="h-3 w-3 mr-1 animate-spin" />
                      Memuat status scan...
                    </div>
                  ) : scanHistory ? (
                    <div className="space-y-1">
                      {scanHistory.hasBeenScanned ? (
                        <div className="flex items-center text-xs text-green-600">
                          <QrCodeIcon className="h-3 w-3 mr-1" />
                          <span className="font-medium">SIMLOK telah discan</span>
                          <span className="ml-2">({scanHistory.totalScans}x)</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-xs text-gray-500">
                          <QrCodeIcon className="h-3 w-3 mr-1" />
                          <span>SIMLOK belum discan</span>
                        </div>
                      )}
                      
                      {scanHistory.lastScan && (
                        <div className="flex items-center text-xs text-gray-500">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          <span>Terakhir discan: {new Date(scanHistory.lastScan.scanned_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-gray-400">
                      <QrCodeIcon className="h-3 w-3 mr-1" />
                      <span>Status scan tidak tersedia</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <DocumentTextIcon className="h-5 w-5 inline mr-2" />
              Detail SIMLOK
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'workers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <UserGroupIcon className="h-5 w-5 inline mr-2" />
              Data Pekerja
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'review'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <CheckCircleIcon className="h-5 w-5 inline mr-2" />
              Review
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {submission && (
            <>
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-8">
                  {/* Header with Status and Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-medium text-gray-900">Informasi SIMLOK</h3>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500">Review:</span>
                        {getStatusBadge(submission.review_status)}
                        <span className="text-sm text-gray-500">Status:</span>
                        {getStatusBadge(submission.final_status)}
                      </div>
                    </div>
                    {canEdit && !isEditing && (
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Edit Data
                      </Button>
                    )}
                    {isEditing && (
                      <div className="space-x-2">
                        <Button
                          onClick={() => setIsEditing(false)}
                          variant="outline"
                          size="sm"
                          disabled={saving}
                        >
                          Batal
                        </Button>
                        <Button
                          onClick={handleSaveChanges}
                          variant="primary"
                          size="sm"
                          disabled={saving}
                        >
                          {saving ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {!canEdit && submission.final_status !== 'PENDING_APPROVAL' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <XCircleIcon className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">Informasi</h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>Data tidak dapat diedit karena sudah difinalisasi oleh approver.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data Vendor */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h4 className="text-base font-semibold text-gray-900 mb-6">Data Vendor & Penanggung Jawab</h4>
                    
                    <div className="space-y-6">
                      {/* Informasi Vendor */}
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h5 className="text-lg font-semibold text-gray-900 mb-6">Informasi Vendor</h5>
                        
                        {/* Informasi Perusahaan */}
                        <div className="mb-6">
                          <h6 className="text-sm font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Informasi Perusahaan</h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nama Perusahaan Vendor <span className="text-red-500">*</span>
                              </label>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={formData.vendor_name}
                                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Nama perusahaan vendor"
                                />
                              ) : (
                                <p className="text-gray-900 py-2 font-medium">{submission.vendor_name}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nomor Telepon Vendor
                              </label>
                              {isEditing ? (
                                <input
                                  type="tel"
                                  value={formData.vendor_phone || ''}
                                  onChange={(e) => setFormData({ ...formData, vendor_phone: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Contoh: 0812-3456-7890"
                                />
                              ) : (
                                <p className="text-gray-900 py-2">
                                  {submission.vendor_phone || (
                                    <span className="text-gray-400 italic">Belum diisi</span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Penanggung Jawab */}
                        <div>
                          <h6 className="text-sm font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Penanggung Jawab Pengajuan</h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nama Petugas <span className="text-red-500">*</span>
                              </label>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={formData.officer_name}
                                  onChange={(e) => setFormData({ ...formData, officer_name: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Nama petugas penanggung jawab"
                                />
                              ) : (
                                <p className="text-gray-900 py-2 font-medium">{submission.officer_name}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Kontak
                              </label>
                              <p className="text-gray-900 py-2">{submission.officer_email || '-'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dokumen Dasar */}
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h5 className="text-lg font-semibold text-gray-900 mb-4">Berdasarkan</h5>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Dokumen Dasar / Referensi <span className="text-red-500">*</span>
                          </label>
                          {isEditing ? (
                            <textarea
                              value={formData.based_on}
                              onChange={(e) => setFormData({ ...formData, based_on: e.target.value })}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Contoh: SPK No. XXX/YYY/ZZZ tanggal DD-MM-YYYY atau Work Order No. ABC123"
                            />
                          ) : (
                            <div className="bg-white rounded-md p-4 border border-gray-200">
                              <p className="text-gray-900 whitespace-pre-line leading-relaxed">{submission.based_on}</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-3">
                            Dokumen kontrak, SPK, Work Order, atau referensi lain yang menjadi dasar pengajuan SIMLOK
                          </p>
                        </div>
                      </div>

                      {/* Status Pengajuan */}
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h5 className="text-lg font-semibold text-gray-900 mb-4">Status Pengajuan</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white rounded-md p-4 border border-gray-200">
                            <div className="text-sm text-gray-600 mb-2 font-medium">Tanggal Pengajuan</div>
                            <div className="text-base font-semibold text-gray-900">
                              {formatDate(submission.created_at)}
                            </div>
                          </div>
                          <div className="bg-white rounded-md p-4 border border-gray-200">
                            <div className="text-sm text-gray-600 mb-2 font-medium">Status Review</div>
                            <div>{getStatusBadge(submission.review_status)}</div>
                          </div>
                          <div className="bg-white rounded-md p-4 border border-gray-200">
                            <div className="text-sm text-gray-600 mb-2 font-medium">Status Persetujuan</div>
                            <div>{getStatusBadge(submission.final_status)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informasi Pekerjaan */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">Informasi Pekerjaan</h4>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Deskripsi Pekerjaan <span className="text-red-500">*</span>
                        </label>
                        {isEditing ? (
                          <textarea
                            value={formData.job_description}
                            onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Deskripsi detail pekerjaan yang akan dilakukan"
                          />
                        ) : (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900 whitespace-pre-line">{submission.job_description}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lokasi Kerja <span className="text-red-500">*</span>
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={formData.work_location}
                              onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Lokasi tempat kerja"
                            />
                          ) : (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg">
                              <p className="text-gray-900 font-medium">{submission.work_location}</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Jam Kerja
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={formData.working_hours}
                              onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Jam kerja (contoh: 08:00 - 16:00)"
                            />
                          ) : (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg">
                              <p className="text-gray-900 font-medium">{submission.working_hours || 'Tidak ditentukan'}</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Jumlah Pekerja
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={formData.worker_count || ''}
                              onChange={(e) => setFormData({ ...formData, worker_count: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Jumlah pekerja"
                            />
                          ) : (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg">
                              <p className="text-gray-900 font-bold text-lg">{submission.worker_count || 0} <span className="text-sm font-normal">orang</span></p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Informasi Tambahan */}
                      {(submission.work_facilities || submission.implementation || submission.other_notes) && (
                        <div className="border-t border-gray-200 pt-4 space-y-4">
                          {submission.work_facilities && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fasilitas Kerja
                              </label>
                              <div className="bg-white p-3 border border-gray-200 rounded-lg">
                                <p className="text-gray-900 text-sm">{submission.work_facilities}</p>
                              </div>
                            </div>
                          )}
                          
                          {submission.implementation && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Keterangan Pelaksanaan
                              </label>
                              <div className="bg-white p-3 border border-gray-200 rounded-lg">
                                <p className="text-gray-900 text-sm whitespace-pre-line">{submission.implementation}</p>
                              </div>
                            </div>
                          )}

                          {submission.other_notes && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Catatan Lainnya
                              </label>
                              <div className="bg-white p-3 border border-gray-200 rounded-lg">
                                <p className="text-gray-900 text-sm whitespace-pre-line">{submission.other_notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dokumen Pendukung */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">Dokumen Pendukung</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nomor SIMJA
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.simja_number}
                            onChange={(e) => setFormData({ ...formData, simja_number: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nomor SIMJA"
                          />
                        ) : (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900 font-medium">{submission.simja_number}</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tanggal SIMJA
                        </label>
                        {isEditing ? (
                          <DatePicker
                            value={formData.simja_date}
                            onChange={(value) => setFormData({ ...formData, simja_date: value })}
                            placeholder="Pilih tanggal SIMJA"
                            className="w-full"
                          />
                        ) : (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900 font-medium">
                              {submission.simja_date ? new Date(submission.simja_date).toLocaleDateString('id-ID') : '-'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nomor SIKA
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.sika_number}
                            onChange={(e) => setFormData({ ...formData, sika_number: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nomor SIKA"
                          />
                        ) : (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900 font-medium">{submission.sika_number}</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tanggal SIKA
                        </label>
                        {isEditing ? (
                          <DatePicker
                            value={formData.sika_date}
                            onChange={(value) => setFormData({ ...formData, sika_date: value })}
                            placeholder="Pilih tanggal SIKA"
                            className="w-full"
                          />
                        ) : (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900 font-medium">
                              {submission.sika_date ? new Date(submission.sika_date).toLocaleDateString('id-ID') : '-'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Jadwal Pelaksanaan */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">Jadwal Pelaksanaan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tanggal Mulai Pelaksanaan
                        </label>
                        {isEditing ? (
                          <DatePicker
                            value={formData.implementation_start_date}
                            onChange={(value) => setFormData({ ...formData, implementation_start_date: value })}
                            placeholder="Pilih tanggal mulai pelaksanaan"
                            className="w-full"
                          />
                        ) : (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900 font-medium">
                              {submission.implementation_start_date ? new Date(submission.implementation_start_date).toLocaleDateString('id-ID') : '-'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tanggal Selesai Pelaksanaan
                        </label>
                        {isEditing ? (
                          <DatePicker
                            value={formData.implementation_end_date}
                            onChange={(value) => setFormData({ ...formData, implementation_end_date: value })}
                            placeholder="Pilih tanggal selesai pelaksanaan"
                            className="w-full"
                          />
                        ) : (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900 font-medium">
                              {submission.implementation_end_date ? new Date(submission.implementation_end_date).toLocaleDateString('id-ID') : '-'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Workers Tab */}
              {activeTab === 'workers' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">Data Pekerja</h3>
                      <div className="flex items-center space-x-2">
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {submission.worker_count || 0} total
                        </span>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {submission.worker_list.length} foto
                        </span>
                      </div>
                    </div>

                    {/* Edit/Cancel Buttons */}
                    {canEdit && (
                      <div className="flex items-center space-x-2">
                        {!isEditingWorkers ? (
                          <Button
                            onClick={handleEditWorkerMode}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            <PencilIcon className="h-4 w-4 mr-1" />
                            Edit Data Pekerja
                          </Button>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={handleCancelWorkerEdit}
                              variant="outline"
                              size="sm"
                              disabled={saving}
                            >
                              Batal
                            </Button>
                            <Button
                              onClick={handleSaveWorkerChanges}
                              variant="primary"
                              size="sm"
                              disabled={saving}
                              className={hasWorkerChanges ? 'bg-orange-600 hover:bg-orange-700' : ''}
                            >
                              {saving ? 'Menyimpan...' : hasWorkerChanges ? 'Simpan Perubahan' : 'Selesai Edit'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Input Jumlah Pekerja */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Jumlah Total Pekerja
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Masukkan jumlah total pekerja yang akan dipekerjakan untuk proyek ini
                        </p>
                        {isEditingWorkers ? (
                          <input
                            type="number"
                            min="0"
                            max="9999"
                            value={formData.worker_count || ''}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              if (inputValue === '') {
                                setFormData({ ...formData, worker_count: 0 });
                                setHasWorkerChanges(true);
                                return;
                              }
                              const value = Math.max(0, parseInt(inputValue) || 0);
                              setFormData({ ...formData, worker_count: value });
                              setHasWorkerChanges(true);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Masukkan jumlah pekerja (0-9999)"
                          />
                        ) : (
                          <div className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900">
                            {submission.worker_count || 0} orang
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <div className="text-sm text-gray-600">
                          <div>Foto terupload: <span className="font-medium text-blue-600">{submission.worker_list.length}</span></div>
                          {(formData.worker_count || submission.worker_count) && (formData.worker_count || submission.worker_count) !== submission.worker_list.length && (
                            <div className={`mt-1 font-medium ${(formData.worker_count || submission.worker_count || 0) > submission.worker_list.length
                              ? 'text-orange-600'
                              : 'text-red-600'
                              }`}>
                              {(formData.worker_count || submission.worker_count || 0) > submission.worker_list.length
                                ? `Kurang ${(formData.worker_count || submission.worker_count || 0) - submission.worker_list.length} foto`
                                : `Kelebihan ${submission.worker_list.length - (formData.worker_count || submission.worker_count || 0)} foto`
                              }
                            </div>
                          )}
                          {(formData.worker_count || submission.worker_count) === submission.worker_list.length && (
                            <div className="text-green-600 mt-1 font-medium">
                              Jumlah sudah sesuai
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info jika jumlah tidak sesuai */}
                  {submission.worker_count && submission.worker_count !== submission.worker_list.length && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-orange-800">Informasi Penting</h3>
                          <p className="text-sm text-orange-700 mt-1">
                            Jumlah pekerja yang diajukan adalah <strong>{submission.worker_count} orang</strong>,
                            tetapi foto yang diupload hanya <strong>{submission.worker_list.length} foto</strong>.
                            {submission.worker_count > submission.worker_list.length
                              ? ' Mungkin ada pekerja yang belum mengupload foto.'
                              : ' Ada lebih banyak foto dari yang diajukan.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit Mode Info */}
                  {canEdit && isEditingWorkers && (
                    <div className={`${hasWorkerChanges ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-6`}>
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {hasWorkerChanges ? (
                            <svg className="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-3">
                          <h3 className={`text-sm font-medium ${hasWorkerChanges ? 'text-orange-800' : 'text-blue-800'}`}>
                            {hasWorkerChanges ? 'Ada Perubahan Belum Disimpan' : 'Mode Edit Aktif'}
                          </h3>
                          <p className={`text-sm ${hasWorkerChanges ? 'text-orange-700' : 'text-blue-700'} mt-1`}>
                            {hasWorkerChanges
                              ? 'Anda telah melakukan perubahan data pekerja. Jangan lupa untuk menyimpan perubahan.'
                              : 'Sekarang Anda dapat menghapus foto pekerja. Hover pada foto untuk melihat tombol hapus.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {submission.worker_list.length === 0 ? (
                    <div className="text-center py-16">
                      <UserGroupIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada foto pekerja</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Foto pekerja akan ditampilkan di sini setelah vendor mengupload data pekerja.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {submission.worker_list.map((worker) => (
                        <div
                          key={worker.id}
                          className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md group"
                        >
                          {/* Photo Section */}
                          <div className="relative p-4 pb-2">
                            <div className="relative">
                              {worker.worker_photo ? (
                                <img
                                  src={worker.worker_photo.startsWith('/') ? worker.worker_photo : `/${worker.worker_photo}`}
                                  alt={`Foto ${worker.worker_name}`}
                                  className="w-full h-48 rounded-lg object-cover shadow-sm"
                                  onLoad={() => console.log('Worker tab - Image loaded successfully for:', worker.worker_name)}
                                  onError={(e) => {
                                    console.log('Worker tab - Image load error for worker:', worker.worker_name, 'URL:', worker.worker_photo);
                                    console.log('Worker tab - Full processed URL:', worker.worker_photo.startsWith('/') ? worker.worker_photo : `/${worker.worker_photo}`);
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgODBDMTA4LjI4NCA4MCA5Ni41NjggODggOTYuNTY4IDEwMEM5Ni41NjggMTEyIDEwOC4yODQgMTIwIDEwMCAxMjBDOTEuNzE2IDEyMCA4My40MzIgMTEyIDgzLjQzMiAxMDBDODMuNDMyIDg4IDkxLjcxNiA4MCA5Ni41NjggODBIMTAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTQwIDEzNkMxNDAgMTI2LjMyIDEzMi4wOTEgMTE4IDEyMiAxMThaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-48 rounded-lg bg-gray-200 flex items-center justify-center shadow-sm">
                                  <div className="text-center text-gray-500">
                                    <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-sm">Tidak ada foto</p>
                                  </div>
                                </div>
                              )}

                              {/* Delete Button - Only show if can edit and in editing mode */}
                              {canEdit && isEditingWorkers && (
                                <button
                                  onClick={() => handleDeleteWorker(worker.id)}
                                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                                  title="Hapus foto pekerja"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Info Section */}
                          <div className="px-4 pb-4">
                            <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                              {worker.worker_name}
                            </h4>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Upload:</span>
                              <span>
                                {new Date(worker.created_at).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Review Tab */}
              {activeTab === 'review' && (
                <div className="  space-y-8">
                  {/* Header Section */}
                  <div className="pb-6 border-b border-gray-200">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Review Pengajuan SIMLOK</h2>
                        <p className="text-gray-600 mt-1">{submission.vendor_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Review Status Display */}
                  {submission.review_status !== 'PENDING_REVIEW' && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h4 className="text-lg font-semibold text-gray-900">Review Selesai</h4>
                            {getStatusBadge(submission.review_status)}
                          </div>
                          {submission.review_note && (
                            <div className="bg-white rounded-lg p-4 border border-blue-100">
                              <h5 className="font-medium text-gray-900 mb-2">Catatan Review</h5>
                              <p className="text-gray-700 whitespace-pre-line leading-relaxed">{submission.review_note}</p>
                            </div>
                          )}
                          <div className="mt-4 space-y-3">
                            {/* Review Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                              <div>
                                <span className="font-medium">Direview pada:</span><br />
                                {submission.reviewed_at ? formatDate(submission.reviewed_at) : '-'}
                              </div>
                              <div>
                                {submission.reviewed_by_name && (
                                  <>
                                    <span className="font-medium">Reviewer:</span><br />
                                    {submission.reviewed_by_name}
                                    {submission.reviewed_by_email && (
                                      <>
                                        <br />
                                        <span className="text-xs text-gray-400">{submission.reviewed_by_email}</span>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Approval Info - Show if final status is not PENDING_APPROVAL */}
                            {submission.final_status !== 'PENDING_APPROVAL' && (
                              <div className="border-t border-blue-200 pt-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                                  <div>
                                    <span className="font-medium">Status Persetujuan:</span><br />
                                    <div className="mt-1">{getStatusBadge(submission.final_status)}</div>
                                    {submission.approved_at && (
                                      <div className="mt-1">
                                        Difinalisasi pada: {formatDate(submission.approved_at)}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    {submission.approved_by_name && (
                                      <>
                                        <span className="font-medium">Approver:</span><br />
                                        {submission.approved_by_name}
                                        {submission.approved_by_email && (
                                          <>
                                            <br />
                                            <span className="text-xs text-gray-400">{submission.approved_by_email}</span>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                {submission.final_note && (
                                  <div className="mt-3 p-3 bg-white rounded-lg border border-blue-100">
                                    <span className="font-medium text-gray-700">Catatan Approver:</span>
                                    <p className="text-gray-600 mt-1 text-sm">{submission.final_note}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Review Form */}
                  {canEdit && (

                      <div className="space-y-6">


                        {/* Catatan Review */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                          <div className="flex items-center mb-4">
                            <div className="flex-shrink-0">
                              <svg className="h-6 w-6 text-gray-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <h5 className="text-lg font-bold text-gray-900">Catatan Review</h5>
                          </div>
                          <div className="space-y-4">
                            {/* Catatan untuk Approver */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-800 mb-2">
                                Catatan untuk Approver <span className="text-red-500">*</span>
                              </label>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                <p className="text-xs text-blue-700 flex items-center">
                                  <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                  Catatan ini akan diteruskan ke Approver untuk membantu pengambilan keputusan final
                                </p>
                              </div>
                              <textarea
                                value={reviewData.review_note}
                                onChange={(e) => setReviewData({ ...reviewData, review_note: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                                placeholder="Berikan penjelasan detail mengenai hasil review, termasuk poin-poin yang perlu diperhatikan approver..."
                                required
                              />
                            </div>

                            {/* Catatan Khusus untuk Vendor */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-800 mb-2">
                                Catatan Khusus untuk Vendor
                              </label>
                              <textarea
                                value={approvalForm.vendor_note}
                                onChange={(e) => setApprovalForm(prev => ({ ...prev, vendor_note: e.target.value }))}
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                                placeholder="Catatan khusus yang perlu diperhatikan vendor (opsional)..."
                              />
                              <p className="text-xs text-gray-500 mt-2">
                                Catatan ini akan dilihat oleh vendor dan akan disertakan dalam PDF SIMLOK
                              </p>
                            </div>

                            {/* Informasi Tambahan */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div>
                                  <h6 className="text-sm font-medium text-blue-800 mb-1">Catatan Penting</h6>
                                  <p className="text-sm text-blue-700">
                                    Catatan review akan diteruskan kepada Approver untuk membantu pengambilan keputusan final.
                                    Pastikan catatan yang diberikan jelas dan objektif.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {reviewData.review_status && !reviewData.review_note.trim() && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-red-600 text-sm font-medium">Catatan untuk Approver wajib diisi</p>
                            </div>
                          )}
                        </div>

                        {/* Submit Button - Removed from here, will be at the bottom */}
                      </div>
                  )}

                  {/* Persiapan Approval Form - Hanya untuk yang bisa edit */}
                  {canEdit && (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mt-8">
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Template Persiapan Approval</h3>
                            <p className="text-sm text-gray-600">
                              Lengkapi data untuk mempersiapkan template approval yang akan digunakan admin
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 space-y-8">
                        {/* Tanggal Pelaksanaan - Menggunakan DateRangePicker yang robust */}
                        <div>
                          <div className="flex items-center space-x-2 mb-6">
                            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                              <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <h4 className="text-base font-medium text-gray-900">Jadwal Pelaksanaan</h4>
                            {implementationDates.duration && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {implementationDates.duration} hari
                              </span>
                            )}
                          </div>

                          {/* DateRangePicker Component */}
                          <DateRangePicker
                            value={{
                              startDate: implementationDates.dates.startDate,
                              endDate: implementationDates.dates.endDate
                            }}
                            onChange={(range) => {
                              implementationDates.updateDates(range);
                            }}
                            startLabel="Tanggal Mulai Pelaksanaan"
                            endLabel="Tanggal Selesai Pelaksanaan"
                            required={true}
                            className="mb-6"
                            {...(implementationDates.errors.startDate || implementationDates.errors.endDate ? {
                              error: implementationDates.errors.startDate || implementationDates.errors.endDate
                            } : {})}
                          />

                          {/* Keterangan Pelaksanaan - Auto generated dari hook */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan Pelaksanaan</label>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
                              <p className="text-sm text-gray-700">
                                {implementationDates.template.pelaksanaan || 'Template akan dibuat otomatis setelah memilih tanggal'}
                              </p>
                            </div>
                            <textarea
                              value={approvalForm.pelaksanaan}
                              onChange={(e) => setApprovalForm(prev => ({ ...prev, pelaksanaan: e.target.value }))}
                              rows={3}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Keterangan akan dibuat otomatis atau Anda bisa mengedit manual..."
                            />
                          </div>
                        </div>

                        {/* Penandatangan */}
                        <div>
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                              <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <h4 className="text-base font-medium text-gray-900">Data Penandatangan</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Jabatan</label>
                              <input
                                type="text"
                                value={approvalForm.jabatan_signer}
                                onChange={(e) => setApprovalForm(prev => ({ ...prev, jabatan_signer: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Sr Officer Security III"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                              <input
                                type="text"
                                value={approvalForm.nama_signer}
                                onChange={(e) => setApprovalForm(prev => ({ ...prev, nama_signer: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Masukkan nama penandatangan"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Template Lain-lain */}
                        <div>
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                              <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <h4 className="text-base font-medium text-gray-900">Template Lain-lain untuk Admin</h4>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Template SIMLOK</span>
                          </div>

                          <div className="space-y-3">
                            {/* Preview dengan formatting */}
                            <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                              <div className="font-medium text-gray-700 mb-2">Preview (dengan formatting):</div>
                              <div 
                                className="whitespace-pre-line text-sm text-gray-900"
                                dangerouslySetInnerHTML={{
                                  __html: approvalForm.lain_lain
                                }}
                              />
                            </div>
                            
                            {/* Rich Text Editor untuk editing */}
                            <RichTextEditor
                              value={approvalForm.lain_lain}
                              onChange={(value) => setApprovalForm(prev => ({ ...prev, lain_lain: value }))}
                              rows={6}
                              placeholder="Template ini akan digunakan admin saat approval SIMLOK. Auto-generate berdasarkan data SIMJA dan SIKA..."
                              className="text-sm"
                            />
                          </div>
                          
                          <p className="text-xs text-gray-500 mt-2">
                            Template ini akan dikirim ke admin sebagai konten "Lain-lain" saat proses approval SIMLOK
                          </p>

                          {implementationDates.isValid ? (
                            <div className="mt-3 flex items-center space-x-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                              <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span>Template berhasil dibuat otomatis berdasarkan data SIMJA dan SIKA ({implementationDates.duration} hari)</span>
                            </div>
                          ) : (
                            <div className="mt-3 flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                              <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span>Pilih tanggal pelaksanaan untuk generate template otomatis</span>
                            </div>
                          )}
                        </div>

                        {/* Content Surat */}
                        {/* <div>
                          <div className="flex items-center space-x-2 mb-4">
                            <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                              <svg className="h-4 w-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <h4 className="text-base font-medium text-gray-900">Isi Surat SIMLOK</h4>
                          </div>

                          <textarea
                            value={approvalForm.content}
                            onChange={(e) => setApprovalForm(prev => ({ ...prev, content: e.target.value }))}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban..."
                          />
                        </div> */}

                      </div>
                      {/* Status Selection */}
                      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200 shadow-sm">
                        <div className="text-center mb-6">
                          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                            <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Keputusan Review</h3>
                          <p className="text-gray-600 text-sm">
                            Pilih hasil review berdasarkan penilaian Anda terhadap pengajuan ini
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Meets Requirements Option */}
                          <label className={`
                              relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                              ${reviewData.review_status === 'MEETS_REQUIREMENTS'
                              ? 'border-green-500 bg-green-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                            }
                            `}>
                            <input
                              type="radio"
                              name="review_status"
                              value="MEETS_REQUIREMENTS"
                              checked={reviewData.review_status === 'MEETS_REQUIREMENTS'}
                              onChange={(e) => setReviewData({ ...reviewData, review_status: e.target.value as any })}
                              className="sr-only"
                            />
                            <div className="flex items-center flex-1">
                              <div className={`
                                  flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center
                                  ${reviewData.review_status === 'MEETS_REQUIREMENTS'
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-gray-300'
                                }
                                `}>
                                {reviewData.review_status === 'MEETS_REQUIREMENTS' && (
                                  <CheckCircleIcon className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">Memenuhi Syarat</div>
                                <div className="text-xs text-gray-500">Pengajuan telah sesuai dengan persyaratan</div>
                              </div>
                            </div>
                          </label>

                          {/* Not Meets Requirements Option */}
                          <label className={`
                              relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                              ${reviewData.review_status === 'NOT_MEETS_REQUIREMENTS'
                              ? 'border-red-500 bg-red-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50'
                            }
                            `}>
                            <input
                              type="radio"
                              name="review_status"
                              value="NOT_MEETS_REQUIREMENTS"
                              checked={reviewData.review_status === 'NOT_MEETS_REQUIREMENTS'}
                              onChange={(e) => setReviewData({ ...reviewData, review_status: e.target.value as any })}
                              className="sr-only"
                            />
                            <div className="flex items-center flex-1">
                              <div className={`
                                  flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center
                                  ${reviewData.review_status === 'NOT_MEETS_REQUIREMENTS'
                                  ? 'border-red-500 bg-red-500'
                                  : 'border-gray-300'
                                }
                                `}>
                                {reviewData.review_status === 'NOT_MEETS_REQUIREMENTS' && (
                                  <XCircleIcon className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">Tidak Memenuhi Syarat</div>
                                <div className="text-xs text-gray-500">Pengajuan perlu perbaikan atau penyesuaian</div>
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                      {/* Combined Submit Button */}
                      <div className="border-t border-gray-200 bg-gray-50 px-6 py-6">
                        <div className="text-center mb-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">Finalisasi Review</h4>
                          <p className="text-gray-600 text-sm">
                            Pastikan semua data sudah benar sebelum mengirim review
                          </p>
                        </div>

                        <Button
                          onClick={handleSubmitReviewAndSave}
                          variant="primary"
                          disabled={!reviewData.review_status || !reviewData.review_note.trim() || saving}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-bold py-4 text-base transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                        >
                          {saving ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                              <span>Mengirim Review & Menyimpan Template...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <svg className="h-5 w-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l3-3z" clipRule="evenodd" />
                              </svg>
                              <span>Submit Review</span>
                            </div>
                          )}
                        </Button>

                        <div className="flex items-center justify-center mt-4 text-xs text-gray-500">
                          <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Review akan dikirim ke approver untuk persetujuan final
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Information for Non-Editable Status */}
                  {!canEdit && submission.final_status !== 'PENDING_APPROVAL' && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 mb-1">Informasi</h4>
                          <p className="text-gray-600">
                            Pengajuan ini sudah difinalisasi dan tidak dapat direview ulang.
                            Status saat ini: {getStatusBadge(submission.final_status)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <div>
            {/* Tampilkan tombol PDF setelah reviewer memberikan status review */}
            {submission?.review_status !== 'PENDING_REVIEW' && (
              <Button onClick={handleViewPdf} variant="primary" size="sm">
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                Lihat Preview PDF SIMLOK
              </Button>
            )}
          </div>
          <Button onClick={onClose} variant="outline">
            Tutup
          </Button>
        </div>
      </div>

      {/* PDF Modal */}
      <SimlokPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        submissionId={submissionId}
        submissionName={submission?.vendor_name || ''}
        nomorSimlok={submission?.simlok_number || ''}
      />
    </div>
  );
};

export default ReviewerSubmissionDetailModal;
