'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  ArrowRightIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  BuildingOfficeIcon,
  UserIcon,
  BriefcaseIcon,
  DocumentIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import { useToast } from '@/hooks/useToast';
import DatePicker from '@/components/form/DatePicker';

import SimlokPdfModal from '@/components/common/SimlokPdfModal';
import DetailSection from '@/components/common/DetailSection';
import InfoCard from '@/components/common/InfoCard';
import DocumentPreviewModal from '@/components/common/DocumentPreviewModal';
import { fileUrlHelper } from '@/lib/fileUrlHelper';
import { useImplementationDates } from '@/hooks/useImplementationDates';

// Types
interface WorkerPhoto {
  id: string;
  worker_name: string;
  worker_photo: string;
  created_at: string;
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
  simja_document_upload?: string | null;
  sika_number: string;
  sika_date: string | null;
  sika_document_upload?: string | null;
  simlok_number: string | null;
  simlok_date: string | null;
  implementation_start_date: string | null;
  implementation_end_date: string | null;
  worker_names: string;
  content: string;
  notes: string;

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

// Date Range Component
interface DateRange {
  startDate: string;
  endDate: string;
}

interface ImprovedDateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  disabled?: boolean;
  className?: string;
}

const ImprovedDateRangePicker: React.FC<ImprovedDateRangePickerProps> = ({
  value,
  onChange,
  disabled = false,
  className = ''
}) => {
  const [localRange, setLocalRange] = useState<DateRange>(value);
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({});

  // Sync with external value
  useEffect(() => {
    setLocalRange(value);
  }, [value]);

  // Validate date range
  const validateRange = useCallback((range: DateRange) => {
    const newErrors: { start?: string; end?: string } = {};

    if (range.startDate && range.endDate) {
      const startDate = new Date(range.startDate);
      const endDate = new Date(range.endDate);

      if (endDate < startDate) {
        newErrors.end = 'Tanggal selesai harus setelah tanggal mulai';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  // Handle start date change
  const handleStartChange = useCallback((startDate: string) => {
    const newRange = { ...localRange, startDate };
    setLocalRange(newRange);

    if (validateRange(newRange)) {
      onChange(newRange);
    }
  }, [localRange, onChange, validateRange]);

  // Handle end date change
  const handleEndChange = useCallback((endDate: string) => {
    const newRange = { ...localRange, endDate };
    setLocalRange(newRange);

    if (validateRange(newRange)) {
      onChange(newRange);
    }
  }, [localRange, onChange, validateRange]);

  // Calculate duration
  const getDuration = useCallback((): number | null => {
    if (!localRange.startDate || !localRange.endDate) return null;

    try {
      const start = new Date(localRange.startDate);
      const end = new Date(localRange.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

      const diffTime = end.getTime() - start.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch {
      return null;
    }
  }, [localRange]);

  const duration = getDuration();
  const hasValidRange = localRange.startDate && localRange.endDate && Object.keys(errors).length === 0;

  return (
    <div className={`relative ${className}`} style={{ overflow: 'visible' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative" style={{ zIndex: 20 }}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Mulai Pelaksanaan
          </label>
          <DatePicker
            value={localRange.startDate}
            onChange={handleStartChange}
            disabled={disabled}
            placeholder="Pilih tanggal mulai"
            className="w-full relative"
          />
          {errors.start && (
            <div className="mt-1 text-sm text-red-600">{errors.start}</div>
          )}
        </div>

        <div className="relative" style={{ zIndex: 20 }}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Selesai Pelaksanaan
          </label>
          <DatePicker
            value={localRange.endDate}
            onChange={handleEndChange}
            disabled={disabled}
            placeholder="Pilih tanggal selesai"
            className="w-full relative"
          />
          {errors.end && (
            <div className="mt-1 text-sm text-red-600">{errors.end}</div>
          )}
        </div>
      </div>

      {hasValidRange && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-blue-800">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <span className="font-medium">Periode Pelaksanaan:</span>
            </div>
            {duration && (
              <div className="text-sm font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                {duration} hari
              </div>
            )}
          </div>
          <div className="mt-2 text-sm text-blue-700">
            <div className="flex items-center">
              <span className="font-medium">
                {localRange.startDate ? new Date(localRange.startDate).toLocaleDateString('id-ID') : ''}
              </span>
              <ArrowRightIcon className="h-4 w-4 mx-2 text-blue-500" />
              <span className="font-medium">
                {localRange.endDate ? new Date(localRange.endDate).toLocaleDateString('id-ID') : ''}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



// Helper functions for status badges
const getReviewStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING_REVIEW':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          <CalendarIcon className="w-3 h-3 mr-1" />
          Menunggu Review
        </span>
      );
    case 'MEETS_REQUIREMENTS':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          Sesuai Persyaratan
        </span>
      );
    case 'NOT_MEETS_REQUIREMENTS':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <XCircleIcon className="w-3 h-3 mr-1" />
          Tidak Sesuai
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          Status Tidak Diketahui
        </span>
      );
  }
};

const getFinalStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <CalendarIcon className="w-3 h-3 mr-1" />
          Menunggu Persetujuan
        </span>
      );
    case 'APPROVED':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          Disetujui
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <XCircleIcon className="w-3 h-3 mr-1" />
          Ditolak
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          Status Tidak Diketahui
        </span>
      );
  }
};

// Main Component Props
interface ReviewerSubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  onReviewSubmitted: () => void;
}

const ImprovedReviewerSubmissionDetailModal: React.FC<ReviewerSubmissionDetailModalProps> = ({
  isOpen,
  onClose,
  submissionId,
  onReviewSubmitted,
}) => {
  // State management
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'workers' | 'review'>('details');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Document preview modal state
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({
    isOpen: false,
    fileUrl: '',
    fileName: ''
  });

  // Worker editing states
  const [isEditingWorkers, setIsEditingWorkers] = useState(false);
  const [editableWorkers, setEditableWorkers] = useState<WorkerPhoto[]>([]);
  const [workersToDelete, setWorkersToDelete] = useState<string[]>([]);
  const [editableWorkerCount, setEditableWorkerCount] = useState(0);
  const [workerCountInput, setWorkerCountInput] = useState('0');
  const [savingWorkers, setSavingWorkers] = useState(false);

  // Form states


  const [reviewData, setReviewData] = useState({
    review_status: '' as 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS' | '',
    review_note: '',
    final_note: ''
  });

  const [approvalForm, setApprovalForm] = useState({
    content: '',
    pelaksanaan: '',
    jabatan_signer: 'Sr Officer Security III',
    nama_signer: 'Julianto Santoso'
  });

  const { showSuccess, showError } = useToast();

  // Helper function to format date for Indonesian locale
  const formatDate = useCallback((dateStr: string | Date) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  }, []);

  // Handle file preview
  const handleFileView = useCallback((fileUrl: string, fileName: string) => {
    if (fileUrl) {
      // Convert legacy URL to new format if needed
      const convertedUrl = fileUrlHelper.convertLegacyUrl(fileUrl, fileName);
      setPreviewModal({
        isOpen: true,
        fileUrl: convertedUrl,
        fileName
      });
    }
  }, []);

  // Close file preview modal
  const handleClosePreview = useCallback(() => {
    setPreviewModal({
      isOpen: false,
      fileUrl: '',
      fileName: ''
    });
  }, []);

  // Use the improved implementation dates hook with stable dependencies
  const implementationDatesHook = useImplementationDates({
    simjaNumber: submission?.simja_number ?? '',
    simjaDate: submission?.simja_date ?? '',
    sikaNumber: submission?.sika_number ?? '',
    sikaDate: submission?.sika_date ?? '',
    signerPosition: approvalForm.jabatan_signer ?? 'Sr Officer Security III'
  });

  // Auto-fill pelaksanaan when implementation dates are set with correct template
  useEffect(() => {
    if (implementationDatesHook.dates.startDate && implementationDatesHook.dates.endDate) {
      const pelaksanaanTemplate = `Terhitung mulai tanggal ${formatDate(implementationDatesHook.dates.startDate)} sampai ${formatDate(implementationDatesHook.dates.endDate)}. Termasuk hari Sabtu, Minggu dan hari libur lainnya.`;

      setApprovalForm(prev => ({
        ...prev,
        pelaksanaan: pelaksanaanTemplate
      }));
    }
  }, [implementationDatesHook.dates.startDate, implementationDatesHook.dates.endDate, formatDate]);



  // Initialize editable workers when submission changes
  useEffect(() => {
    if (submission?.worker_list) {
      setEditableWorkers([...submission.worker_list]);
      setWorkersToDelete([]);
      const count = submission.worker_count || submission.worker_list.length;
      setEditableWorkerCount(count);
      setWorkerCountInput(count.toString());
    }
  }, [submission?.worker_list, submission?.worker_count]);



  // Sync input with worker count changes
  useEffect(() => {
    if (!isEditingWorkers) {
      setWorkerCountInput(editableWorkerCount.toString());
    }
  }, [editableWorkerCount, isEditingWorkers]);

  // Auto-sync worker count when workers are added/removed during editing
  useEffect(() => {
    if (isEditingWorkers) {
      // Only auto-sync when workers are actually added or removed
      // Don't force input changes when user manually changes count
      // This allows user to freely edit the input without interference
    }
  }, [editableWorkers.length, isEditingWorkers]);

  // Fetch submission details
  const fetchSubmissionDetail = useCallback(async () => {
    if (!submissionId || !isOpen) return;

    console.log('[Modal] Fetching submission detail for:', submissionId);

    try {
      setLoading(true);

      // Add abort controller to prevent multiple simultaneous requests
      const controller = new AbortController();

      const response = await fetch(`/api/reviewer/simloks/${submissionId}`, {
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 404) {
          showError('Pengajuan Tidak Ditemukan', 'Pengajuan sudah dihapus oleh vendor');
          onClose();
          // Add delay before refreshing so user can see the error message
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const sub = data.submission;
      setSubmission(sub);

      setReviewData({
        review_status: sub.review_status === 'PENDING_REVIEW' ? '' : sub.review_status,
        review_note: sub.review_note || '',
        final_note: sub.final_note || ''
      });

      setApprovalForm({
        content: sub.content || 'Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis.',
        pelaksanaan: sub.implementation || '',
        jabatan_signer: sub.signer_position || 'Sr Officer Security III',
        nama_signer: sub.signer_name || 'Julianto Santoso'
      });

    } catch (err: any) {
      console.error('Error fetching submission:', err);
      if (err.name !== 'AbortError') {
        showError('Error', err.message || 'Gagal memuat detail pengajuan');
      }
    } finally {
      setLoading(false);
    }
  }, [submissionId, isOpen, showError]);

  // Fetch scan history
  const fetchScanHistory = useCallback(async () => {
    if (!submissionId || !isOpen) return;

    console.log('[Modal] Fetching scan history for:', submissionId);

    try {
      const controller = new AbortController();

      const response = await fetch(`/api/submissions/${submissionId}/scans`, {
        signal: controller.signal
      });

      if (response.ok) {
        await response.json();
        // Scan history loaded successfully
      } else if (response.status !== 404) {
        console.warn('Failed to fetch scan history:', response.statusText);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching scan history:', err);
      }
    }
  }, [submissionId, isOpen]);

  // Handle review submission
  const handleSubmitReview = useCallback(async () => {
    if (!reviewData.review_status) {
      showError('Error', 'Pilih status review terlebih dahulu');
      return;
    }

    if (!reviewData.review_note.trim()) {
      showError('Error', 'Catatan review wajib diisi');
      return;
    }

    if (!reviewData.final_note.trim()) {
      showError('Error', 'Catatan untuk vendor wajib diisi');
      return;
    }

    try {
      setSaving(true);

      // 1. Save implementation dates and template data
      const updatePayload = {
        implementation_start_date: implementationDatesHook.dates.startDate,
        implementation_end_date: implementationDatesHook.dates.endDate,
        implementation: approvalForm.pelaksanaan,
        content: approvalForm.content,
        signer_position: approvalForm.jabatan_signer,
        signer_name: approvalForm.nama_signer,
        // Preserve SIMJA and SIKA dates to prevent them from being lost
        simja_number: submission?.simja_number,
        simja_date: submission?.simja_date,
        sika_number: submission?.sika_number,
        sika_date: submission?.sika_date,
        // Preserve worker count to prevent it from being reset
        worker_count: editableWorkerCount
      };

      const saveResponse = await fetch(`/api/reviewer/simloks/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!saveResponse.ok) {
        if (saveResponse.status === 404) {
          showError('Pengajuan Tidak Ditemukan', 'Pengajuan sudah dihapus oleh vendor');
          onClose();
          // Add delay before refreshing so user can see the error message
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
        throw new Error('Gagal menyimpan template approval');
      }

      // 2. Submit review
      const reviewResponse = await fetch(`/api/reviewer/simloks/${submissionId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });

      if (!reviewResponse.ok) {
        if (reviewResponse.status === 404) {
          showError('Pengajuan Tidak Ditemukan', 'Pengajuan sudah dihapus oleh vendor');
          onClose();
          // Add delay before refreshing so user can see the error message
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
        const errorData = await reviewResponse.json();
        throw new Error(errorData.error || 'Gagal mengirim review');
      }

      const data = await reviewResponse.json();
      setSubmission(data.submission);
      showSuccess('Berhasil', 'Review berhasil dikirim dan template approval tersimpan');
      onReviewSubmitted();

    } catch (err: any) {
      console.error('Error submitting review:', err);
      showError('Error', err.message || 'Gagal mengirim review');
    } finally {
      setSaving(false);
    }
  }, [
    submissionId,
    reviewData,
    implementationDatesHook.dates.startDate,
    implementationDatesHook.dates.endDate,
    implementationDatesHook.template.pelaksanaan,
    implementationDatesHook.template.lainLain,
    approvalForm,
    showSuccess,
    showError,
    onReviewSubmitted
  ]);

  // Effects with debouncing to prevent duplicate calls
  useEffect(() => {
    if (!isOpen || !submissionId) {
      return;
    }

    // Reset states when opening
    setActiveTab('details');
    setLoading(true);

    // Debounce the fetch calls
    const timeoutId = setTimeout(() => {
      fetchSubmissionDetail();
      fetchScanHistory();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isOpen, submissionId]); // Removed function dependencies to prevent infinite loops

  // Initialize dates when submission data is loaded
  useEffect(() => {
    if (submission?.implementation_start_date && submission?.implementation_end_date) {
      implementationDatesHook.updateDates({
        startDate: new Date(submission.implementation_start_date).toISOString().split('T')[0] || '',
        endDate: new Date(submission.implementation_end_date).toISOString().split('T')[0] || ''
      });
    }
  }, [submission?.implementation_start_date, submission?.implementation_end_date]);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup with delay to prevent rendering issues
      const timeoutId = setTimeout(() => {
        setSubmission(null);
        setLoading(false);
        setSaving(false);
        setIsPdfModalOpen(false);
        setActiveTab('details');
        setReviewData({
          review_status: '',
          review_note: '',
          final_note: ''
        });
        setApprovalForm({
          content: '',
          pelaksanaan: '',
          jabatan_signer: 'Sr Officer Security III',
          nama_signer: 'Julianto Santoso'
        });
        implementationDatesHook.reset();
      }, 50);

      return () => clearTimeout(timeoutId);
    }

    return undefined;
  }, [isOpen]);

  // Worker management functions
  const addWorker = () => {
    const newWorker: WorkerPhoto = {
      id: `temp_${Date.now()}`,
      worker_name: '',
      worker_photo: '',
      created_at: new Date().toISOString(),
    };
    setEditableWorkers(prev => [...prev, newWorker]);
  };

  const removeWorker = (workerId: string) => {
    // If it's a new temp worker, remove it immediately
    if (workerId.startsWith('temp_')) {
      setEditableWorkers(prev => prev.filter(w => w.id !== workerId));
    } else {
      // For existing workers, mark for deletion and hide from UI
      setWorkersToDelete(prev => [...prev, workerId]);
      setEditableWorkers(prev => prev.filter(w => w.id !== workerId));
    }
  };

  const updateWorkerName = (workerId: string, name: string) => {
    setEditableWorkers(prev =>
      prev.map(w => w.id === workerId ? { ...w, worker_name: name } : w)
    );
  };

  const updateWorkerPhoto = async (workerId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`/api/reviewer/worker-photos/${workerId}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const { photo_url } = await response.json();
        setEditableWorkers(prev =>
          prev.map(w => w.id === workerId ? { ...w, worker_photo: photo_url } : w)
        );
        showSuccess('Berhasil', 'Photo berhasil diunggah');
      } else {
        showError('Error', 'Gagal mengunggah photo');
      }
    } catch (error) {
      showError('Error', 'Terjadi kesalahan saat mengunggah photo');
    }
  };

  const saveWorkerChanges = async () => {
    // Validate worker count before saving
    if (editableWorkerCount === 0) {
      showError('Error', 'Harap mengisikan jumlah pekerja yang valid (minimal 1 orang)');
      return;
    }

    try {
      setSavingWorkers(true);

      // First, delete workers that were marked for deletion
      if (workersToDelete.length > 0) {
        for (const workerId of workersToDelete) {
          try {
            await fetch(`/api/reviewer/simloks/${submission?.id}/workers/${workerId}`, {
              method: 'DELETE',
            });
          } catch (error) {
            console.warn(`Failed to delete worker ${workerId}:`, error);
          }
        }
      }

      // Then update the worker list
      const response = await fetch(`/api/reviewer/simloks/${submission?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          worker_list: editableWorkers,
          worker_count: editableWorkerCount
        }),
      });

      if (response.ok) {
        await response.json();

        // Update local submission state to reflect deleted workers
        if (submission) {
          const filteredWorkers = submission.worker_list.filter(w => !workersToDelete.includes(w.id));
          setSubmission({
            ...submission,
            worker_list: [...filteredWorkers, ...editableWorkers.filter(w => w.id.startsWith('temp_'))],
            worker_count: editableWorkerCount
          });
        }

        // Clear workers to delete
        setWorkersToDelete([]);
        setIsEditingWorkers(false);
        showSuccess('Berhasil', 'Data pekerja berhasil diperbarui');
      } else {
        showError('Error', 'Gagal memperbarui data pekerja');
      }
    } catch (error) {
      showError('Error', 'Terjadi kesalahan saat memperbarui data pekerja');
    } finally {
      setSavingWorkers(false);
    }
  };

  const cancelWorkerEditing = () => {
    if (submission?.worker_list) {
      setEditableWorkers([...submission.worker_list]);
      const count = submission.worker_count || submission.worker_list.length;
      setEditableWorkerCount(count);
      setWorkerCountInput(count.toString());
    }
    setWorkersToDelete([]);
    setIsEditingWorkers(false);
  };

  // Helper functions
  const canEdit = useMemo(() => {
    return submission && submission.final_status === 'PENDING_APPROVAL';
  }, [submission?.final_status]);

  // Prevent rendering if not open or no submissionId
  if (!isOpen || !submissionId) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between  p-6 border-b border-gray-200 flex-shrink-0">
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
                  </p>
                )}
              </div>
            )}
          </div>
          <Button onClick={onClose} variant="ghost" size="sm">
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
              {/* Review Tab */}
              {activeTab === 'review' && (
                <div className="space-y-8">
                  {/* Review Form */}
                  <div className="bg-white rounded-2xl gap-4 space-y-4 p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4 ">
                      <h3 className="text-lg font-bold text-gray-900">Review Pengajuan SIMLOK</h3>
                      {submission.review_status !== 'PENDING_REVIEW' && (
                        <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                          Sudah Direview
                        </span>
                      )}
                    </div>



                    {/* Implementation Dates */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 relative">
                      <h4 className="text-base font-medium text-gray-900 mb-4">Jadwal Pelaksanaan</h4>
                      <div style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
                        <ImprovedDateRangePicker
                          value={implementationDatesHook.dates}
                          onChange={implementationDatesHook.updateDates}
                          disabled={submission.final_status !== 'PENDING_APPROVAL'}
                          className="mb-4"
                        />
                      </div>

                      {/* Generated Templates Preview */}
                      {implementationDatesHook.template.pelaksanaan && (
                        <div className="mt-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Template Pelaksanaan (Auto-generated)
                            </label>
                            <div className="p-3 bg-gray-50 border rounded-lg text-sm">
                              {implementationDatesHook.template.pelaksanaan}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pelaksanaan Input Fields */}
                      {implementationDatesHook.template.pelaksanaan && (
                        <div className="mt-6 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              5. Pelaksanaan
                            </label>
                            <textarea
                              value={approvalForm.pelaksanaan}
                              onChange={(e) => setApprovalForm(prev => ({ ...prev, pelaksanaan: e.target.value }))}
                              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${submission.final_status !== 'PENDING_APPROVAL' ? 'bg-gray-50' : ''
                                }`}
                              rows={3}
                              placeholder="Terhitung mulai tanggal..."
                              readOnly={submission.final_status !== 'PENDING_APPROVAL'}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              6. Jam Kerja
                            </label>
                            <input
                              type="text"
                              value={submission?.working_hours || '08:00 WIB - 17:00 WIB'}
                              readOnly
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Jam kerja diambil dari data vendor (tidak dapat diubah di tahap review)
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              7. Lain-lain (Preview Template)
                            </label>
                            <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                              <div className="text-gray-700 whitespace-pre-line">
                                {(() => {
                                  let template = "Izin diberikan berdasarkan:";

                                  // SIMJA section
                                  if (submission.simja_number && submission.simja_date) {
                                    template += `\n• Simja Ast Man Facility Management\n  ${submission.simja_number} Tgl. ${formatDate(submission.simja_date)}`;
                                  }

                                  // SIKA section  
                                  if (submission.sika_number && submission.sika_date) {
                                    template += `\n• SIKA Pekerjaan Dingin\n  ${submission.sika_number} Tgl. ${formatDate(submission.sika_date)}`;
                                  }

                                  // Head of Security section - akan diisi saat approval dengan tanggal SIMLOK
                                  template += `\n  Diterima Sr Officer Security III\n  [Tanggal SIMLOK - akan diisi saat approval]`;

                                  return template;
                                })()}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              ℹ️ Template ini akan di-generate otomatis oleh approver saat approval berdasarkan data SIMJA, SIKA dan tanggal SIMLOK. Reviewer tidak perlu mengisi field ini.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Signer Information */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                      <h4 className="text-base font-medium text-gray-900 mb-4">Data Penandatangan</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Jabatan</label>
                          <input
                            type="text"
                            value={approvalForm.jabatan_signer}
                            onChange={(e) => setApprovalForm(prev => ({ ...prev, jabatan_signer: e.target.value }))}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${submission.final_status !== 'PENDING_APPROVAL' ? 'bg-gray-50' : ''
                              }`}
                            readOnly={submission.final_status !== 'PENDING_APPROVAL'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                          <input
                            type="text"
                            value={approvalForm.nama_signer}
                            onChange={(e) => setApprovalForm(prev => ({ ...prev, nama_signer: e.target.value }))}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${submission.final_status !== 'PENDING_APPROVAL' ? 'bg-gray-50' : ''
                              }`}
                            readOnly={submission.final_status !== 'PENDING_APPROVAL'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Content Field - Isi Surat Izin Masuk Lokasi */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                      <h4 className="text-base font-medium text-gray-900 mb-4">Content - Isi Surat Izin Masuk Lokasi</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content
                          <span className="text-xs text-gray-500 ml-1">(Isi surat izin masuk lokasi)</span>
                        </label>
                        <textarea
                          value={approvalForm.content}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, content: e.target.value }))}
                          rows={4}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${submission.final_status !== 'PENDING_APPROVAL' ? 'bg-gray-50' : ''
                            }`}
                          placeholder="Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis."
                          readOnly={submission.final_status !== 'PENDING_APPROVAL'}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Isi ketentuan dan syarat-syarat untuk surat izin masuk lokasi
                        </p>
                      </div>
                    </div>

                  </div>
                  <div className="space-y-4 bg-white rounded-2xl gap-4 p-6 border border-gray-200 shadow-sm">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Catatan untuk Approver <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={reviewData.review_note}
                        onChange={(e) => setReviewData({ ...reviewData, review_note: e.target.value })}
                        rows={4}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${submission.final_status !== 'PENDING_APPROVAL' ? 'bg-gray-50' : ''
                          }`}
                        placeholder="Berikan penjelasan detail mengenai hasil review..."
                        readOnly={submission.final_status !== 'PENDING_APPROVAL'}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Catatan untuk Vendor <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={reviewData.final_note}
                        onChange={(e) => setReviewData({ ...reviewData, final_note: e.target.value })}
                        rows={4}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${submission.final_status !== 'PENDING_APPROVAL' ? 'bg-gray-50' : ''
                          }`}
                        placeholder="Berikan keterangan yang akan ditampilkan kepada vendor..."
                        readOnly={submission.final_status !== 'PENDING_APPROVAL'}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Catatan ini akan ditampilkan kepada vendor setelah pengajuan disetujui/ditolak
                      </p>
                    </div>
                  </div>
                  {/* Review Decision */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Keputusan Review</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${reviewData.review_status === 'MEETS_REQUIREMENTS'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-green-300'
                        }`}>
                        <input
                          type="radio"
                          name="review_status"
                          value="MEETS_REQUIREMENTS"
                          checked={reviewData.review_status === 'MEETS_REQUIREMENTS'}
                          onChange={(e) => setReviewData({ ...reviewData, review_status: e.target.value as any })}
                          className="sr-only"
                          disabled={submission.final_status !== 'PENDING_APPROVAL'}
                        />
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-5 w-5 mr-3 text-green-500" />
                          <div>
                            <div className="font-medium">Memenuhi Syarat</div>
                            <div className="text-sm text-gray-500">Sesuai persyaratan</div>
                          </div>
                        </div>
                      </label>

                      <label className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${reviewData.review_status === 'NOT_MEETS_REQUIREMENTS'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-red-300'
                        }`}>
                        <input
                          type="radio"
                          name="review_status"
                          value="NOT_MEETS_REQUIREMENTS"
                          checked={reviewData.review_status === 'NOT_MEETS_REQUIREMENTS'}
                          onChange={(e) => setReviewData({ ...reviewData, review_status: e.target.value as any })}
                          className="sr-only"
                          disabled={submission.final_status !== 'PENDING_APPROVAL'}
                        />
                        <div className="flex items-center">
                          <XCircleIcon className="h-5 w-5 mr-3 text-red-500" />
                          <div>
                            <div className="font-medium">Tidak Memenuhi Syarat</div>
                            <div className="text-sm text-gray-500">Perlu perbaikan</div>
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Submit Button - Available while final status is PENDING_APPROVAL */}
                    {submission.final_status === 'PENDING_APPROVAL' && (
                      <div className="mt-6">
                        <Button
                          onClick={handleSubmitReview}
                          variant="primary"
                          disabled={!reviewData.review_status || !reviewData.review_note.trim() || !reviewData.final_note.trim() || saving}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold py-4 text-base"
                        >
                          {saving ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                              <span>
                                {submission.review_status === 'PENDING_REVIEW'
                                  ? 'Mengirim Review...'
                                  : 'Memperbarui Review...'}
                              </span>
                            </div>
                          ) : (
                            <span>
                              {submission.review_status === 'PENDING_REVIEW'
                                ? 'Submit Review'
                                : 'Update Review'}
                            </span>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Review Status Info - Show when already reviewed and can still edit */}
                    {submission.review_status !== 'PENDING_REVIEW' && submission.final_status === 'PENDING_APPROVAL' && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-center">
                          <div className="text-sm text-blue-700 mb-2 flex items-center justify-center">
                            <span className="mr-2">Status saat ini:</span>
                            {getReviewStatusBadge(submission.review_status)}
                          </div>
                          <p className="text-sm text-blue-600">
                            Anda dapat mengubah review ini karena belum disetujui/ditolak oleh approver
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Final Review Status - Show when review is locked */}
                    {submission.final_status !== 'PENDING_APPROVAL' && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-2">
                            {getReviewStatusBadge(submission.review_status)}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            Status Akhir: {getFinalStatusBadge(submission.final_status)}
                          </div>
                          <p className="text-sm text-gray-500">
                            Review telah selesai pada {submission.reviewed_at ? new Date(submission.reviewed_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '-'}
                          </p>
                          {submission.reviewed_by_name && (
                            <p className="text-xs text-gray-400 mt-1">
                              Direview oleh: {submission.reviewed_by_name}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Header dengan Status dan Review */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Detail SIMLOK</h3>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">Review:</span>
                      {getReviewStatusBadge(submission.review_status)}
                      <span className="text-sm text-gray-500">Status:</span>
                      {getFinalStatusBadge(submission.final_status)}
                    </div>
                  </div>

                  {/* Informasi Vendor - menggunakan DetailSection seperti admin */}
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
                      {/* <InfoCard
                        label="Email"
                        value={submission.officer_email || '-'}
                      /> */}
                      <InfoCard
                        label="Nomor Telepon Vendor"
                        value={submission.vendor_phone || '-'}
                      />
                      <InfoCard
                        label="Berdasarkan"
                        value={submission.based_on}
                      />
                    </div>
                  </DetailSection>

                  {/* Informasi Dokumen - sama seperti admin */}
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

                        />
                      )}
                      {/* Status dan Tanggal Pengajuan */}

                    </div>

                    <div className="grid grid-cols-1 mt-5 md:grid-cols-2 gap-4">
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

                  {/* Detail Pekerjaan - sama seperti admin */}
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
                        label="Jumlah Pekerja"
                        value={`${submission.worker_count || 0} orang`}
                      />
                      <InfoCard
                        label="Sarana Kerja"
                        value={submission.work_facilities}
                      />
                    </div>

                  </DetailSection>

                </div>
              )}

              {/* Workers Tab */}
              {activeTab === 'workers' && (
                <div className="space-y-6">
                  {/* Header dengan jumlah pekerja */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Data Pekerja</h3>
                    <div className="flex items-center space-x-3">
                      {canEdit && (
                        isEditingWorkers ? (
                          <div className="flex gap-2">
                            <Button
                              onClick={cancelWorkerEditing}
                              variant="outline"
                              size="sm"
                            >
                              Batal
                            </Button>
                            <Button
                              onClick={saveWorkerChanges}
                              variant="primary"
                              size="sm"
                              disabled={savingWorkers}
                            >
                              {savingWorkers ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setIsEditingWorkers(true)}
                            variant="primary"
                            size="sm"
                          >
                            <PencilIcon className="w-4 h-4 mr-2" />
                            Edit Pekerja
                          </Button>
                        )
                      )}

                      {/* Badge Total selalu tampil */}
                      <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                        Total: {isEditingWorkers ? editableWorkerCount : (submission.worker_count ||
                          (submission.worker_names ? submission.worker_names.split('\n').filter(name => name.trim()).length : submission.worker_list.length)
                        )} pekerja
                      </span>
                    </div>
                  </div>

                  {/* Worker Count Configuration - Vendor Style */}
                  {isEditingWorkers && (
                    <div className="space-y-4 mb-6">
                      <div>
                        <label htmlFor="jumlah_pekerja" className="mb-1.5 block text-sm font-medium text-gray-700">
                          Jumlah Pekerja
                        </label>
                        <input
                          id="jumlah_pekerja"
                          name="jumlah_pekerja"
                          type="text"
                          value={workerCountInput}
                          onChange={(e) => {
                            const inputValue = e.target.value;

                            // Allow completely empty input (show placeholder)
                            if (inputValue === '') {
                              setWorkerCountInput('');
                              setEditableWorkerCount(0);
                              return;
                            }

                            // Only allow numeric input - remove any non-numeric characters
                            const cleanValue = inputValue.replace(/\D/g, '');

                            // If after cleaning there's nothing left, make it empty
                            if (cleanValue === '') {
                              setWorkerCountInput('');
                              setEditableWorkerCount(0);
                              return;
                            }

                            const numValue = parseInt(cleanValue, 10);
                            if (!isNaN(numValue) && numValue >= 0 && numValue <= 9999) {
                              setWorkerCountInput(cleanValue);
                              setEditableWorkerCount(numValue);
                            }
                          }}
                          onKeyDown={(e) => {
                            // Allow all navigation and editing keys
                            const allowedKeys = [
                              'Backspace', 'Delete', 'Tab', 'Enter', 'Escape',
                              'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                              'Home', 'End', 'PageUp', 'PageDown'
                            ];

                            if (allowedKeys.includes(e.key)) {
                              return; // Allow these keys
                            }

                            // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
                            if (e.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) {
                              return;
                            }

                            // Only allow numeric keys (0-9)
                            if (!/[0-9]/.test(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onBlur={() => {
                            // Only auto-correct to 1 if user actually wants to save with empty value
                            // During editing, allow empty state to show placeholder
                            if (workerCountInput === '') {
                              // Keep it empty to show placeholder, don't force a value
                              setEditableWorkerCount(0);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Masukkan jumlah pekerja"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Jumlah total pekerja yang akan bekerja di lokasi ini
                        </p>
                      </div>

                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg w-full">
                        <div className="font-medium mb-1">Info:</div>
                        <div>Pekerja yang diinput foto: {editableWorkers.length}</div>
                        <div>Jumlah pekerja: {editableWorkerCount || 0}</div>
                        {editableWorkerCount > 0 && editableWorkers.length !== editableWorkerCount && (
                          <div className="text-orange-600 mt-1">
                            Jumlah tidak sesuai dengan daftar pekerja
                          </div>
                        )}
                        {editableWorkerCount > 0 && editableWorkers.length === editableWorkerCount && (
                          <div className="text-green-600 mt-1">
                            Jumlah sesuai dengan daftar pekerja
                          </div>
                        )}
                        {editableWorkerCount === 0 && (
                          <div className="text-red-600 mt-1">
                            Harap mengisikan jumlah pekerja (minimal 1 orang)
                          </div>
                        )}
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
                      {(isEditingWorkers ? editableWorkers : submission.worker_list).map((worker, workerIndex) => (
                        <div
                          key={`worker-${workerIndex}-${worker.worker_name}`}
                          className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md group"
                        >
                          {/* Photo Section */}
                          <div className="relative p-4 pb-2">
                            <div className="relative">
                              {worker.worker_photo ? (
                                <img
                                  src={worker.worker_photo}
                                  alt={`Foto ${worker.worker_name}`}
                                  className="w-full h-48 rounded-lg object-cover shadow-sm"
                                  onError={(e) => {
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
                              {isEditingWorkers && (
                                <div className="absolute top-2 right-2 flex gap-1">
                                  <label className="cursor-pointer bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600 transition-colors">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          updateWorkerPhoto(worker.id, file);
                                        }
                                      }}
                                    />
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </label>
                                  <button
                                    onClick={() => removeWorker(worker.id)}
                                    className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Info Section */}
                          <div className="px-4 pb-4">
                            {isEditingWorkers ? (
                              <input
                                type="text"
                                value={worker.worker_name}
                                onChange={(e) => updateWorkerName(worker.id, e.target.value)}
                                className="w-full font-semibold text-gray-900 text-sm mb-1 border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                placeholder="Nama pekerja"
                              />
                            ) : (
                              <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                                {worker.worker_name}
                              </h4>
                            )}
                          </div>
                        </div>
                      ))}
                      {isEditingWorkers && (
                        <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                          <button
                            onClick={addWorker}
                            className="w-full h-64 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <PlusIcon className="w-12 h-12 mb-2" />
                            <span className="text-sm font-medium">Tambah Pekerja</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-white">
          <div>
            {submission?.review_status !== 'PENDING_REVIEW' && !isEditingWorkers && (
              <Button onClick={() => setIsPdfModalOpen(true)} variant="primary" size="sm">
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

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={handleClosePreview}
        fileUrl={previewModal.fileUrl}
        fileName={previewModal.fileName}
      />
    </div>
  );
};

export default ImprovedReviewerSubmissionDetailModal;