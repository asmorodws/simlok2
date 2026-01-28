'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  CalendarIcon,
  ArrowRightIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  DocumentIcon,
  DocumentArrowUpIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { useToast } from '@/hooks/useToast';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import DateRangePicker from '@/components/form/DateRangePicker';
import TimeRangePicker from '@/components/form/TimeRangePicker';

import SimlokPdfModal from '@/components/features/document/modal/SimlokPdfModal';
import DetailSection from '@/components/shared/card/DetailSection';
import InfoCard from '@/components/shared/card/InfoCard';
import DocumentPreviewModal from '@/components/features/document/modal/DocumentPreviewModal';
import SupportDocumentsSection from '@/components/features/document/section/SupportDocumentsSection';
import TabNavigation, { type TabItem } from '@/components/features/submission/card/TabNavigation';
import { SubmissionStatusCards } from '@/components/features/submission/card/StatusCards';
import { fileUrlHelper } from '@/lib/file/fileUrlHelper';
import { useImplementationDates } from '@/hooks/useImplementationDates';
import {
  type BaseSubmissionDetail,
  formatDate,
  formatWorkLocation,
  ReviewStatusBadge,
  ApprovalStatusBadge,
} from '@/components/features/submission/shared/SubmissionDetailShared';
import type { WorkerPhoto } from '@/types';
import { hasWeekendInRange } from '@/utils/date/dateHelpers';


// Types

// Using BaseSubmissionDetail from shared utilities
type SubmissionDetail = BaseSubmissionDetail;

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
  disabled: _disabled = false,
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
    setLocalRange(prev => {
      const newRange = { ...prev, startDate };
      
      // Validate and call onChange
      if (validateRange(newRange)) {
        onChange(newRange);
      }
      
      return newRange;
    });
  }, [onChange, validateRange]);

  // Handle end date change
  const handleEndChange = useCallback((endDate: string) => {
    setLocalRange(prev => {
      const newRange = { ...prev, endDate };
      
      // Validate and call onChange
      if (validateRange(newRange)) {
        onChange(newRange);
      }
      
      return newRange;
    });
  }, [onChange, validateRange]);

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
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tanggal Pelaksanaan
        </label>
        <DateRangePicker
          startDate={localRange.startDate}
          endDate={localRange.endDate}
          onStartDateChange={handleStartChange}
          onEndDateChange={handleEndChange}
        />
        {errors.start && (
          <div className="mt-1 text-sm text-red-600">{errors.start}</div>
        )}
        {errors.end && (
          <div className="mt-1 text-sm text-red-600">{errors.end}</div>
        )}
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



// Helper functions for status badges - now using shared components
const getReviewStatusBadge = (status: string) => <ReviewStatusBadge status={status} />;

const getFinalStatusBadge = (status: string) => <ApprovalStatusBadge status={status} />;

// Main Component Props
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
  const [showConfirmSaveWorkers, setShowConfirmSaveWorkers] = useState(false);

  // Form states


  const [reviewData, setReviewData] = useState({
    review_status: '' as 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS' | '',
    review_note: '',
    final_note: ''
  });

  const [approvalForm, setApprovalForm] = useState({
    content: '',
    pelaksanaan: '',

  });

  // Working hours state - editable by reviewer
  const [workingHours, setWorkingHours] = useState('08:00 WIB - 17:00 WIB');
  const [holidayWorkingHours, setHolidayWorkingHours] = useState('');
  const [showHolidayWorkingHours, setShowHolidayWorkingHours] = useState(false);

  // Implementation dates state - editable by reviewer
  const [implementationStartDate, setImplementationStartDate] = useState('');

  // Tab configuration
  const tabs: TabItem[] = [
    { key: 'details', label: 'Detail SIMLOK', shortLabel: 'Detail', icon: DocumentTextIcon },
    { key: 'workers', label: 'Data Pekerja', shortLabel: 'Pekerja', icon: UserGroupIcon },
    { key: 'review', label: 'Proses Review', shortLabel: 'Review', icon: ClipboardDocumentCheckIcon },
  ];

  const [implementationEndDate, setImplementationEndDate] = useState('');

  const { showSuccess, showError } = useToast();

  // Handle working hours change
  const handleWorkingHoursChange = useCallback((value: string) => {
    setWorkingHours(value);
  }, []);

  // Handle holiday working hours change
  const handleHolidayWorkingHoursChange = useCallback((value: string) => {
    setHolidayWorkingHours(value);
  }, []);

  // Use shared formatDate and formatWorkLocation from SubmissionDetailShared
  // (removed local duplicate functions)

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
    supportingDoc1Type: submission?.supporting_doc1_type ?? '',
    supportingDoc1Number: submission?.supporting_doc1_number ?? '',
    supportingDoc1Date: submission?.supporting_doc1_date ?? '',
    supportingDoc2Type: submission?.supporting_doc2_type ?? '',
    supportingDoc2Number: submission?.supporting_doc2_number ?? '',
    supportingDoc2Date: submission?.supporting_doc2_date ?? '',

  });

  // Auto-fill pelaksanaan when implementation dates are set with correct template
  useEffect(() => {
    if (implementationDatesHook.dates.startDate && implementationDatesHook.dates.endDate) {
      const pelaksanaanTemplate = `Terhitung mulai tanggal ${formatDate(implementationDatesHook.dates.startDate)} sampai ${formatDate(implementationDatesHook.dates.endDate)}. Termasuk hari Sabtu, Minggu dan hari libur lainnya.`;

      setApprovalForm(prev => ({
        ...prev,
        pelaksanaan: pelaksanaanTemplate
      }));

      // Check if there's weekend in the date range
      const hasWeekend = hasWeekendInRange(
        implementationDatesHook.dates.startDate,
        implementationDatesHook.dates.endDate
      );
      
      setShowHolidayWorkingHours(hasWeekend);
      
      // Clear holiday working hours if no weekend
      if (!hasWeekend) {
        setHolidayWorkingHours('');
      }
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

      const response = await fetch(`/api/submissions/${submissionId}`, {
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

      if (!sub) {
        throw new Error('Data submission tidak ditemukan dalam response');
      }

      setSubmission(sub);

      setReviewData({
        review_status: sub.review_status === 'PENDING_REVIEW' ? '' : sub.review_status,
        review_note: sub.note_for_approver || '',
        final_note: sub.note_for_vendor || ''
      });

      setApprovalForm({
        content: sub.content || 'Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis.',
        pelaksanaan: sub.implementation || '',

      });

      // Initialize working hours from submission data
      console.log('[Modal] Working hours from DB:', {
        working_hours: sub.working_hours,
        holiday_working_hours: sub.holiday_working_hours
      });
      
      setWorkingHours(sub.working_hours || '');
      setHolidayWorkingHours(sub.holiday_working_hours || '');

      // Initialize implementation dates from submission data
      setImplementationStartDate(sub.implementation_start_date || '');
      setImplementationEndDate(sub.implementation_end_date || '');

      // Check if there's weekend in existing date range to show/hide holiday working hours field
      if (sub.implementation_start_date && sub.implementation_end_date) {
        const hasWeekend = hasWeekendInRange(sub.implementation_start_date, sub.implementation_end_date);
        setShowHolidayWorkingHours(hasWeekend);
      }

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

  // Clear unnecessary notes when review status changes
  useEffect(() => {
    if (reviewData.review_status === 'MEETS_REQUIREMENTS') {
      // Clear vendor note when choosing MEETS_REQUIREMENTS
      setReviewData(prev => ({ ...prev, final_note: '' }));
    } else if (reviewData.review_status === 'NOT_MEETS_REQUIREMENTS') {
      // Clear approver note when choosing NOT_MEETS_REQUIREMENTS
      setReviewData(prev => ({ ...prev, review_note: '' }));
    }
  }, [reviewData.review_status]);

  // Handle review submission
  const handleSubmitReview = useCallback(async () => {
    console.log('🔍 Review Data:', reviewData);
    
    if (!reviewData.review_status) {
      showError('Status Review Belum Dipilih', 'Silakan pilih status review terlebih dahulu sebelum mengirim.');
      return;
    }

    // Validasi catatan sesuai dengan status yang dipilih
    if (reviewData.review_status === 'MEETS_REQUIREMENTS') {
      console.log('✅ Checking MEETS_REQUIREMENTS - review_note:', reviewData.review_note);
      if (!reviewData.review_note.trim()) {
        showError('Catatan Approver Belum Diisi', 'Catatan untuk approver wajib diisi ketika pengajuan memenuhi syarat.');
        return;
      }
    }

    if (reviewData.review_status === 'NOT_MEETS_REQUIREMENTS') {
      console.log('❌ Checking NOT_MEETS_REQUIREMENTS - final_note:', reviewData.final_note);
      if (!reviewData.final_note.trim()) {
        showError('Catatan Vendor Belum Diisi', 'Catatan untuk vendor wajib diisi ketika pengajuan tidak memenuhi syarat.');
        return;
      }
    }

    // Gunakan tanggal dari state lokal (yang diedit reviewer) atau fallback ke hook
    const finalStartDate = implementationStartDate || implementationDatesHook.dates.startDate;
    const finalEndDate = implementationEndDate || implementationDatesHook.dates.endDate;

    // Validasi tanggal implementasi wajib
    if (!finalStartDate || !finalStartDate.trim()) {
      showError('Tanggal Mulai Belum Diisi', 'Tanggal mulai pelaksanaan wajib diisi sebelum mengirim review.');
      return;
    }

    if (!finalEndDate || !finalEndDate.trim()) {
      showError('Tanggal Selesai Belum Diisi', 'Tanggal selesai pelaksanaan wajib diisi sebelum mengirim review.');
      return;
    }

    // Validasi bahwa tanggal selesai tidak boleh lebih awal dari tanggal mulai
    const startDate = new Date(finalStartDate);
    const endDate = new Date(finalEndDate);

    if (endDate < startDate) {
      showError('Tanggal Tidak Valid', 'Tanggal selesai pelaksanaan tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    try {
      setSaving(true);

      // 1. Save implementation dates and template data
      const updatePayload = {
        implementation_start_date: finalStartDate,
        implementation_end_date: finalEndDate,
        implementation: approvalForm.pelaksanaan,
        content: approvalForm.content,
        working_hours: workingHours,  // kirim jam kerja yang diedit
        holiday_working_hours: holidayWorkingHours || null,  // kirim jam kerja hari libur
        // Preserve SIMJA and SIKA dates to prevent them from being lost
        supporting_doc1_type: submission?.supporting_doc1_type,
        supporting_doc1_number: submission?.supporting_doc1_number,
        supporting_doc1_date: submission?.supporting_doc1_date,
        supporting_doc2_type: submission?.supporting_doc2_type,
        supporting_doc2_number: submission?.supporting_doc2_number,
        supporting_doc2_date: submission?.supporting_doc2_date,
        // Preserve worker count to prevent it from being reset
        worker_count: editableWorkerCount
      };

      console.log('Reviewer - Sending implementation dates to API:', {
        implementation_start_date: updatePayload.implementation_start_date,
        implementation_end_date: updatePayload.implementation_end_date,
        submissionId
      });

      const saveResponse = await fetch(`/api/submissions/${submissionId}`, {
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

      // 2. Submit review - Map frontend field names to API expected names
      // Hanya kirim field yang sesuai dengan status review
      const reviewPayload: any = {
        review_status: reviewData.review_status,
        // Include editable fields in review payload
        working_hours: workingHours,
        holiday_working_hours: holidayWorkingHours || null,
        implementation: approvalForm.pelaksanaan,  // map pelaksanaan to implementation (DB field name)
        content: approvalForm.content,
        implementation_start_date: finalStartDate,
        implementation_end_date: finalEndDate,
      };

      // Tambahkan note sesuai dengan status yang dipilih
      if (reviewData.review_status === 'MEETS_REQUIREMENTS') {
        reviewPayload.note_for_approver = reviewData.review_note;
        reviewPayload.note_for_vendor = ''; // Kosongkan note vendor
      } else if (reviewData.review_status === 'NOT_MEETS_REQUIREMENTS') {
        reviewPayload.note_for_vendor = reviewData.final_note;
        reviewPayload.note_for_approver = ''; // Kosongkan note approver
      }

      console.log('Sending review payload:', reviewPayload);

      const reviewResponse = await fetch(`/api/submissions/${submissionId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewPayload),
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
    implementationStartDate,
    implementationEndDate,
    approvalForm,
    workingHours,
    holidayWorkingHours,
    editableWorkerCount,
    submission?.supporting_doc1_type,
    submission?.supporting_doc1_number,
    submission?.supporting_doc1_date,
    submission?.supporting_doc2_type,
    submission?.supporting_doc2_number,
    submission?.supporting_doc2_date,
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
      // Parse dates in Jakarta timezone to avoid device timezone issues
      const parseJakartaDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const jakartaStr = date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
        const jakartaDate = new Date(jakartaStr);
        const year = jakartaDate.getFullYear();
        const month = String(jakartaDate.getMonth() + 1).padStart(2, '0');
        const day = String(jakartaDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      implementationDatesHook.updateDates({
        startDate: parseJakartaDate(submission.implementation_start_date) || '',
        endDate: parseJakartaDate(submission.implementation_end_date) || ''
      });
    }
  }, [submission?.implementation_start_date, submission?.implementation_end_date]);

  // Sync implementation dates from hook to local state for display in Details tab
  useEffect(() => {
    if (implementationDatesHook.dates.startDate && implementationDatesHook.dates.endDate) {
      setImplementationStartDate(implementationDatesHook.dates.startDate);
      setImplementationEndDate(implementationDatesHook.dates.endDate);
    }
  }, [implementationDatesHook.dates.startDate, implementationDatesHook.dates.endDate]);

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
        });
        setWorkingHours('08:00 WIB - 17:00 WIB');
        setHolidayWorkingHours('');
        setImplementationStartDate('');
        setImplementationEndDate('');
        implementationDatesHook.reset();
      }, 50);

      return () => clearTimeout(timeoutId);
    }

    return undefined;
  }, [isOpen]);

  // Worker management functions - Only delete is allowed, no add or edit
  // const addWorker = () => {
  //   const newWorker: WorkerPhoto = {
  //     id: `temp_${Date.now()}`,
  //     worker_name: '',
  //     worker_photo: '',
  //     hsse_pass_number: null,
  //     hsse_pass_valid_thru: null,
  //     hsse_pass_document_upload: null,
  //     created_at: new Date().toISOString(),
  //   };
  //   setEditableWorkers(prev => [...prev, newWorker]);
  // };

  const removeWorker = (workerId: string) => {
    // Prevent deletion if only one worker remains
    if (editableWorkers.length <= 1) {
      showError('Tidak Dapat Menghapus', 'Minimal harus ada 1 pekerja. Tidak dapat menghapus semua data pekerja.');
      return;
    }

    // If it's a new temp worker, remove it immediately
    if (workerId.startsWith('temp_')) {
      setEditableWorkers(prev => prev.filter(w => w.id !== workerId));
    } else {
      // For existing workers, mark for deletion and hide from UI
      setWorkersToDelete(prev => [...prev, workerId]);
      setEditableWorkers(prev => prev.filter(w => w.id !== workerId));
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
            await fetch(`/api/submissions/${submission?.id}/workers/${workerId}`, {
              method: 'DELETE',
            });
          } catch (error) {
            console.warn(`Failed to delete worker ${workerId}:`, error);
          }
        }
      }

      // Then update the worker list
      const response = await fetch(`/api/submissions/${submission?.id}`, {
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

  const handleSaveClick = () => {
    // Show confirmation modal before actually saving
    setShowConfirmSaveWorkers(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmSaveWorkers(false);
    await saveWorkerChanges();
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
    return submission && submission.approval_status === 'PENDING_APPROVAL';
  }, [submission?.approval_status]);

  // Prevent rendering if not open or no submissionId
  if (!isOpen || !submissionId) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-none sm:rounded-xl shadow-xl w-full h-full sm:max-w-6xl sm:w-full sm:max-h-[90vh] sm:h-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Detail & Review Pengajuan</h2>
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

                {/* Review and Approval Info */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2 pt-2 border-t border-gray-100">
                  {submission.reviewed_by && submission.review_status !== 'PENDING_REVIEW' && (
                    <p className="flex items-center">
                      <CheckCircleIcon className="h-3.5 w-3.5 mr-1 text-blue-500" />
                      <span className="font-medium">Direview oleh:</span>
                      <span className="ml-1">{submission.reviewed_by}</span>
                    </p>
                  )}
                  {submission.approved_by && submission.approval_status !== 'PENDING_APPROVAL' && (
                    <p className="flex items-center">
                      <CheckCircleIcon className="h-3.5 w-3.5 mr-1 text-green-500" />
                      <span className="font-medium">Disetujui oleh:</span>
                      <span className="ml-1">{submission.approved_by}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <Button onClick={onClose} variant="ghost" size="sm">
            <XMarkIcon className="h-6 w-6" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <TabNavigation 
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(key) => setActiveTab(key as 'details' | 'workers' | 'review')}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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
                        <Badge variant="info">
                          Sudah Direview
                        </Badge>
                      )}
                    </div>



                    {/* Implementation Dates */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 relative">
                      <h4 className="text-base font-medium text-gray-900 mb-4">Jadwal Pelaksanaan</h4>
                      <div style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
                        <ImprovedDateRangePicker
                          value={implementationDatesHook.dates}
                          onChange={implementationDatesHook.updateDates}
                          disabled={submission.approval_status !== 'PENDING_APPROVAL'}
                          className="mb-4"
                        />
                      </div>



                      <div className="mt-6 space-y-4">
                        {/* Tanggal Pelaksanaan Input - Editable */}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Jam Kerja (Hari Kerja)
                          </label>
                          <TimeRangePicker
                            value={workingHours}
                            onChange={handleWorkingHoursChange}
                            disabled={submission.approval_status !== 'PENDING_APPROVAL'}
                            placeholder="Pilih jam kerja"
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {submission.approval_status === 'PENDING_APPROVAL'
                              ? 'Jam kerja dapat diubah oleh reviewer pada tahap review'
                              : 'Jam kerja sudah ditetapkan dan tidak dapat diubah'
                            }
                          </p>
                        </div>
                        {showHolidayWorkingHours && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Jam Kerja (Hari Libur) 
                            <span className="text-xs text-blue-600 ml-2">
                              (Range tanggal termasuk Sabtu/Minggu)
                            </span>
                          </label>
                          <TimeRangePicker
                            value={holidayWorkingHours}
                            onChange={handleHolidayWorkingHoursChange}
                            disabled={submission.approval_status !== 'PENDING_APPROVAL'}
                            placeholder="Kosongkan jika tidak ada jam kerja hari libur"
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {submission.approval_status === 'PENDING_APPROVAL'
                              ? 'Isi jika ada jam kerja khusus untuk hari libur (Sabtu, Minggu, tanggal merah)'
                              : 'Jam kerja hari libur sudah ditetapkan'
                            }
                          </p>
                        </div>
                        )}
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
                          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${submission.approval_status !== 'PENDING_APPROVAL' ? 'bg-gray-50' : ''
                            }`}
                          placeholder="Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis."
                          readOnly={submission.approval_status !== 'PENDING_APPROVAL'}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Isi ketentuan dan syarat-syarat untuk surat izin masuk lokasi
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Review Decision */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Keputusan Review</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <label className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${reviewData.review_status === 'MEETS_REQUIREMENTS'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-green-300'
                        }`}>
                        <input
                          type="radio"
                          name="review_status"
                          value="MEETS_REQUIREMENTS"
                          checked={reviewData.review_status === 'MEETS_REQUIREMENTS'}
                          onChange={(e) => {
                            const newStatus = e.target.value as 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
                            setReviewData({ 
                              ...reviewData, 
                              review_status: newStatus,
                              final_note: '' // Clear vendor note saat pilih MEETS_REQUIREMENTS
                            });
                          }}
                          className="sr-only"
                          disabled={submission.approval_status !== 'PENDING_APPROVAL'}
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
                          onChange={(e) => {
                            const newStatus = e.target.value as 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
                            setReviewData({ 
                              ...reviewData, 
                              review_status: newStatus,
                              review_note: '' // Clear approver note saat pilih NOT_MEETS_REQUIREMENTS
                            });
                          }}
                          className="sr-only"
                          disabled={submission.approval_status !== 'PENDING_APPROVAL'}
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

                    {/* Conditional Notes Fields */}
                    {reviewData.review_status === 'MEETS_REQUIREMENTS' && (
                      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Catatan untuk Approver <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={reviewData.review_note}
                            onChange={(e) => setReviewData({ ...reviewData, review_note: e.target.value })}
                            rows={4}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${submission.approval_status !== 'PENDING_APPROVAL' ? 'bg-gray-50' : ''
                              }`}
                            placeholder="Berikan penjelasan detail mengenai hasil review untuk approver..."
                            readOnly={submission.approval_status !== 'PENDING_APPROVAL'}
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Catatan ini akan dikirim ke approver untuk proses persetujuan
                          </p>
                        </div>
                      </div>
                    )}

                    {reviewData.review_status === 'NOT_MEETS_REQUIREMENTS' && (
                      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Catatan untuk Vendor <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={reviewData.final_note}
                            onChange={(e) => setReviewData({ ...reviewData, final_note: e.target.value })}
                            rows={4}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${submission.approval_status !== 'PENDING_APPROVAL' ? 'bg-gray-50' : ''
                              }`}
                            placeholder="Jelaskan bagian mana yang perlu diperbaiki oleh vendor..."
                            readOnly={submission.approval_status !== 'PENDING_APPROVAL'}
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Catatan ini akan ditampilkan kepada vendor untuk melakukan perbaikan
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Submit Button - Available while final status is PENDING_APPROVAL */}
                    {submission.approval_status === 'PENDING_APPROVAL' && (
                      <div className="mt-6">
                        <Button
                          onClick={handleSubmitReview}
                          variant="primary"
                          disabled={
                            saving ||
                            !reviewData.review_status || 
                            (reviewData.review_status === 'MEETS_REQUIREMENTS' && !reviewData.review_note.trim()) ||
                            (reviewData.review_status === 'NOT_MEETS_REQUIREMENTS' && !reviewData.final_note.trim())
                          }
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
                    {submission.review_status !== 'PENDING_REVIEW' && submission.approval_status === 'PENDING_APPROVAL' && (
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
                    {submission.approval_status !== 'PENDING_APPROVAL' && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-2">
                            {getReviewStatusBadge(submission.review_status)}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            Status Akhir: {getFinalStatusBadge(submission.approval_status)}
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
                          {submission.reviewed_by && (
                            <p className="text-xs text-gray-400 mt-1">
                              Direview oleh: {submission.reviewed_by}
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
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Detail SIMLOK</h3>
                    </div>

                    {/* Status Cards */}
                    <SubmissionStatusCards
                      createdAt={submission.created_at}
                      reviewStatusBadge={getReviewStatusBadge(submission.review_status)}
                      approvalStatusBadge={getFinalStatusBadge(submission.approval_status)}
                    />
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

                      />
                      <InfoCard
                        label="Alamat Email"
                        value={submission.user_email || '-'}

                      />
                      <InfoCard
                        label="Nomor Telepon"
                        value={submission.vendor_phone || '-'}
                      />
                      {/* <InfoCard
                        label="Berdasarkan"
                        value={submission.based_on}
                      /> */}
                    </div>
                  </DetailSection>



                  {/* Dokumen Pendukung - tampilan bersebelahan */}
                  {(submission.supporting_doc1_type || submission.supporting_doc2_type) && (
                    <DetailSection
                      title="Dokumen Pendukung"
                      icon={<DocumentTextIcon className="h-5 w-5 text-purple-500" />}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Dokumen Pendukung 1 */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900 border-b pb-2">Dokumen Pendukung 1</h4>
                          {submission.supporting_doc1_type && (
                            <InfoCard
                              label="Jenis Dokumen"
                              value={submission.supporting_doc1_type}
                            />
                          )}
                          {submission.supporting_doc1_number && (
                            <InfoCard
                              label="Nomor Dokumen"
                              value={submission.supporting_doc1_number}
                            />
                          )}
                          {submission.supporting_doc1_date && (
                            <InfoCard
                              label="Tanggal Dokumen"
                              value={formatDate(submission.supporting_doc1_date)}
                            />
                          )}
                        </div>

                        {/* Dokumen Pendukung 2 */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900 border-b pb-2">Dokumen Pendukung 2</h4>
                          {submission.supporting_doc2_type && (
                            <InfoCard
                              label="Jenis Dokumen"
                              value={submission.supporting_doc2_type}
                            />
                          )}
                          {submission.supporting_doc2_number && (
                            <InfoCard
                              label="Nomor Dokumen"
                              value={submission.supporting_doc2_number}
                            />
                          )}
                          {submission.supporting_doc2_date && (
                            <InfoCard
                              label="Tanggal Dokumen"
                              value={formatDate(submission.supporting_doc2_date)}
                            />
                          )}
                        </div>
                      </div>

                      {/* Upload Documents Preview - bersebelahan */}
                      {(submission.supporting_doc1_upload || submission.supporting_doc2_upload) && (
                        <div className="mt-6">
                          <h5 className="font-medium text-gray-900 mb-4">File Dokumen Pendukung</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Dokumen Pendukung 1 Upload */}
                            {submission.supporting_doc1_upload && (
                              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                                <div className="flex items-center space-x-3">
                                  <DocumentIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {submission.supporting_doc1_type || 'Dokumen Pendukung 1'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {submission.supporting_doc1_number || 'File tersedia'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleFileView(submission.supporting_doc1_upload!, submission.supporting_doc1_type || 'Dokumen Pendukung 1')}
                                  className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <EyeIcon className="w-4 h-4" />
                                  <span>Lihat</span>
                                </button>
                              </div>
                            )}

                            {/* Dokumen Pendukung 2 Upload */}
                            {submission.supporting_doc2_upload && (
                              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                                <div className="flex items-center space-x-3">
                                  <DocumentIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {submission.supporting_doc2_type || 'Dokumen Pendukung 2'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {submission.supporting_doc2_number || 'File tersedia'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleFileView(submission.supporting_doc2_upload!, submission.supporting_doc2_type || 'Dokumen Pendukung 2')}
                                  className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <EyeIcon className="w-4 h-4" />
                                  <span>Lihat</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </DetailSection>
                  )}

                  {/* Support Documents Section - New */}
                  {submission.support_documents && submission.support_documents.length > 0 && (
                    <SupportDocumentsSection
                      supportDocuments={submission.support_documents}
                      onViewDocument={handleFileView}
                    />
                  )}

                  {/* SIMJA/SIKA/HSSE Document Uploads - Legacy fallback */}
                  {!submission.support_documents?.length && (submission.simja_document_upload || submission.sika_document_upload || submission.hsse_pass_document_upload) && (
                    <DetailSection
                      title="File Dokumen SIMJA/SIKA/HSSE (Legacy)"
                      icon={<DocumentArrowUpIcon className="h-5 w-5 text-gray-500" />}
                    >
                      <div className={`grid grid-cols-1 gap-4 ${submission.hsse_pass_document_upload
                          ? 'md:grid-cols-3'
                          : 'md:grid-cols-2'
                        }`}>
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
                            <button
                              onClick={() => handleFileView(submission.simja_document_upload!, 'Dokumen SIMJA')}
                              className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <EyeIcon className="w-4 h-4" />
                              <span>Lihat</span>
                            </button>
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
                            <button
                              onClick={() => handleFileView(submission.sika_document_upload!, 'Dokumen SIKA')}
                              className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <EyeIcon className="w-4 h-4" />
                              <span>Lihat</span>
                            </button>
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
                            <button
                              onClick={() => handleFileView(submission.hsse_pass_document_upload!, 'Dokumen HSSE Pass')}
                              className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <EyeIcon className="w-4 h-4" />
                              <span>Lihat</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </DetailSection>
                  )}

                  {/* Message if no documents */}
                  {!submission.support_documents?.length && !submission.supporting_doc1_upload && !submission.supporting_doc2_upload &&
                    !submission.simja_document_upload && !submission.sika_document_upload &&
                    !submission.hsse_pass_document_upload && (
                      <div className="col-span-2 text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">Tidak ada dokumen</h3>
                        <p className="text-sm text-gray-500">Belum ada dokumen yang diupload</p>
                      </div>
                    )}

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
                        value={formatWorkLocation(submission.work_location)}
                      />
                      <InfoCard
                        label="Pelaksanaan"
                        value={
                          // Prioritize local state (edited dates) over submission data
                          implementationStartDate && implementationEndDate
                            ? `${formatDate(implementationStartDate)} s/d ${formatDate(implementationEndDate)}`
                            : submission.implementation_start_date && submission.implementation_end_date
                            ? `${formatDate(submission.implementation_start_date)} s/d ${formatDate(submission.implementation_end_date)}`
                            : submission.implementation || 'Belum diisi'
                        }
                      />
                      <InfoCard
                        label="Jam Kerja"
                        value={
                          <div className="space-y-0.5 text-sm font-normal text-gray-900">
                            <div>{workingHours || submission.working_hours} (Hari kerja)</div>
                            {(holidayWorkingHours || submission.holiday_working_hours) && (
                              <div>{holidayWorkingHours || submission.holiday_working_hours} (Hari libur)</div>
                            )}
                          </div>
                        }
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
                              onClick={handleSaveClick}
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
                      <Badge variant="info">
                        Total: {isEditingWorkers ? editableWorkerCount : (submission.worker_count ||
                          (submission.worker_names ? submission.worker_names.split('\n').filter(name => name.trim()).length : submission.worker_list.length)
                        )} pekerja
                      </Badge>
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

                  {!submission.worker_list || submission.worker_list.length === 0 ? (
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
                                <div className="absolute top-2 right-2">
                                  <button
                                    onClick={() => removeWorker(worker.id)}
                                    className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors shadow-lg flex items-center gap-1"
                                    title="Hapus pekerja dan semua datanya"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                    <span className="text-xs font-medium">Hapus</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Info Section - Always Read-Only */}
                          <div className="px-4 pb-4">

                            <h4 className="font-semibold text-gray-900 text-sm mb-2 truncate">
                              {worker.worker_name}
                            </h4>
                            {(worker.hsse_pass_number || worker.hsse_pass_valid_thru || worker.hsse_pass_document_upload) && (
                              <div className="space-y-1 text-xs text-gray-600 border-t pt-2 mt-2">
                                {worker.hsse_pass_number && (
                                  <div className="flex justify-between">
                                    <span className="font-medium">HSSE Pass:</span>
                                    <span>{worker.hsse_pass_number}</span>
                                  </div>
                                )}
                                {worker.hsse_pass_valid_thru && (
                                  <div className="flex justify-between">
                                    <span className="font-medium">Masa Berlaku HSSE Pass Sampai Dengan:</span>
                                    <span>{new Date(worker.hsse_pass_valid_thru).toLocaleDateString('id-ID')}</span>
                                  </div>
                                )}
                                {worker.hsse_pass_document_upload && (
                                  <div className="mt-2">
                                    <button
                                      onClick={() => handleFileView(worker.hsse_pass_document_upload!, `Dokumen HSSE Pass - ${worker.worker_name}`)}
                                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                      <EyeIcon className="w-4 h-4" />
                                      <span>Lihat Dokumen HSSE</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-gray-200 bg-white">
          <div>
            <Button onClick={() => setIsPdfModalOpen(true)} variant="primary" size="sm" className="text-xs sm:text-sm">
              <DocumentTextIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">
                {submission?.approval_status === 'APPROVED' ? 'Lihat PDF' : 'Lihat Preview PDF SIMLOK'}
              </span>
              <span className="sm:hidden">
                {submission?.approval_status === 'APPROVED' ? 'PDF' : 'Preview PDF'}
              </span>
            </Button>
          </div>
          <Button onClick={onClose} variant="outline" className="text-xs sm:text-sm">
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

      {/* Confirm save workers modal */}
      <ConfirmModal
        isOpen={showConfirmSaveWorkers}
        onClose={() => setShowConfirmSaveWorkers(false)}
        onConfirm={handleConfirmSave}
        title={editableWorkerCount !== editableWorkers.length ? 'Jumlah pekerja tidak sesuai' : 'Konfirmasi Simpan Data Pekerja'}
        message={
          editableWorkerCount !== editableWorkers.length
            ? `Jumlah pekerja yang dimasukan (${editableWorkerCount}) tidak sesuai dengan jumlah pekerja yang memiliki foto / daftar (${editableWorkers.length}). Jika Anda tetap menyimpan, jumlah pekerja akan diset ke ${editableWorkerCount}. Apakah Anda yakin ingin melanjutkan?`
            : 'Anda yakin ingin menyimpan perubahan data pekerja ke database? Perubahan ini akan memperbarui daftar pekerja yang tersimpan.'
        }
        confirmText="Simpan"
        cancelText="Batal"
        variant={editableWorkerCount !== editableWorkers.length ? 'warning' : 'info'}
        isLoading={savingWorkers}
      />
    </div>
  );
};

export default ReviewerSubmissionDetailModal;