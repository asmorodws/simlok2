'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import { useToast } from '@/hooks/useToast';
import DatePicker from '@/components/form/DatePicker';

import SimlokPdfModal from '@/components/common/SimlokPdfModal';
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
  onReviewSubmitted
}) => {
  // State management
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'workers' | 'review'>('details');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  
  // Form states
  
  
  const [reviewData, setReviewData] = useState({
    review_status: '' as 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS' | '',
    review_note: ''
  });
  
  const [approvalForm, setApprovalForm] = useState({
    vendor_note: '',
    content: '',
    jabatan_signer: 'Sr Officer Security III',
    nama_signer: 'Julianto Santoso'
  });

  const { showSuccess, showError } = useToast();

  // Use the improved implementation dates hook with stable dependencies
  const implementationDatesHook = useImplementationDates({
    simjaNumber: submission?.simja_number ?? '',
    simjaDate: submission?.simja_date ?? '',
    sikaNumber: submission?.sika_number ?? '',
    sikaDate: submission?.sika_date ?? '',
    signerPosition: approvalForm.jabatan_signer ?? 'Sr Officer Security III'
  });

  // Auto-fill content when template changes
  useEffect(() => {
    if (implementationDatesHook.template.lainLain && !approvalForm.content) {
      setApprovalForm(prev => ({
        ...prev,
        content: implementationDatesHook.template.lainLain
      }));
    }
  }, [implementationDatesHook.template.lainLain, approvalForm.content]);

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
          throw new Error('Pengajuan tidak ditemukan');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const sub = data.submission;
      setSubmission(sub);

      setReviewData({
        review_status: sub.review_status === 'PENDING_REVIEW' ? '' : sub.review_status,
        review_note: sub.review_note || ''
      });

      setApprovalForm({
        vendor_note: sub.vendor_note || '',
        content: sub.content || 'Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis.',
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

    try {
      setSaving(true);

      // 1. Save implementation dates and template data
      const updatePayload = {
        implementation_start_date: implementationDatesHook.dates.startDate,
        implementation_end_date: implementationDatesHook.dates.endDate,
        implementation: implementationDatesHook.template.pelaksanaan,
        other_notes: implementationDatesHook.template.lainLain,
        vendor_note: approvalForm.vendor_note,
        content: approvalForm.content,
        signer_position: approvalForm.jabatan_signer,
        signer_name: approvalForm.nama_signer
      };

      const saveResponse = await fetch(`/api/reviewer/simloks/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!saveResponse.ok) {
        throw new Error('Gagal menyimpan template approval');
      }

      // 2. Submit review
      const reviewResponse = await fetch(`/api/reviewer/simloks/${submissionId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
          review_note: ''
        });
        setApprovalForm({
          vendor_note: '',
          content: '',
          jabatan_signer: 'Sr Officer Security III',
          nama_signer: 'Julianto Santoso'
        });
        implementationDatesHook.reset();
      }, 50);

      return () => clearTimeout(timeoutId);
    }
    
    return undefined;
  }, [isOpen]);

  // Helper functions
  const canEdit = useMemo(() => {
    return submission && submission.review_status === 'PENDING_REVIEW';
  }, [submission?.review_status]);

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
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 inline mr-2" />
              Detail SIMLOK
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'workers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserGroupIcon className="h-5 w-5 inline mr-2" />
              Data Pekerja
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'review'
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
              {activeTab === 'review' && canEdit && (
                <div className="space-y-8">
                  {/* Review Form */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Review Pengajuan SIMLOK</h3>
                    
                    {/* Review Notes */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Catatan untuk Approver <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={reviewData.review_note}
                          onChange={(e) => setReviewData({ ...reviewData, review_note: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Berikan penjelasan detail mengenai hasil review..."
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Catatan Khusus untuk Vendor
                        </label>
                        <textarea
                          value={approvalForm.vendor_note}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, vendor_note: e.target.value }))}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Catatan khusus yang perlu diperhatikan vendor (opsional)..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Implementation Dates */}
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 relative">
                    <h4 className="text-base font-medium text-gray-900 mb-4">Jadwal Pelaksanaan</h4>
                    <div style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
                      <ImprovedDateRangePicker
                        value={implementationDatesHook.dates}
                        onChange={implementationDatesHook.updateDates}
                        className="mb-4"
                      />
                    </div>
                    
                    {/* Generated Templates Preview */}
                    {implementationDatesHook.template.pelaksanaan && (
                      <div className="mt-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Template Pelaksanaan (Auto-generated)
                          </label>
                          <div className="p-3 bg-gray-50 border rounded-lg text-sm">
                            {implementationDatesHook.template.pelaksanaan}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Template Lain-lain (Auto-generated)
                          </label>
                          <div 
                            className="p-3 bg-gray-50 border rounded-lg text-sm"
                            dangerouslySetInnerHTML={{ __html: implementationDatesHook.template.lainLain }}
                          />
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                        <input
                          type="text"
                          value={approvalForm.nama_signer}
                          onChange={(e) => setApprovalForm(prev => ({ ...prev, nama_signer: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Content/Lain-lain Field */}
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                    <h4 className="text-base font-medium text-gray-900 mb-4">Lain-lain</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Isi Lain-lain
                      </label>
                      <textarea
                        value={approvalForm.content}
                        onChange={(e) => setApprovalForm(prev => ({ ...prev, content: e.target.value }))}
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                        placeholder="Konten lain-lain akan ter-generate otomatis berdasarkan template..."
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Template akan otomatis terisi berdasarkan data SIMJA, SIKA, dan tanggal pelaksanaan. 
                        Anda dapat mengedit sesuai kebutuhan.
                      </p>
                    </div>
                    
                    {/* Button to fill with template */}
                    {implementationDatesHook.template.lainLain && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setApprovalForm(prev => ({ 
                            ...prev, 
                            content: implementationDatesHook.template.lainLain 
                          }))}
                          className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          Gunakan Template Auto-Generated
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Review Decision */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Keputusan Review</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        reviewData.review_status === 'MEETS_REQUIREMENTS'
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
                        />
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-5 w-5 mr-3 text-green-500" />
                          <div>
                            <div className="font-medium">Memenuhi Syarat</div>
                            <div className="text-sm text-gray-500">Sesuai persyaratan</div>
                          </div>
                        </div>
                      </label>

                      <label className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        reviewData.review_status === 'NOT_MEETS_REQUIREMENTS'
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

                    {/* Submit Button */}
                    <div className="mt-6">
                      <Button
                        onClick={handleSubmitReview}
                        variant="primary"
                        disabled={!reviewData.review_status || !reviewData.review_note.trim() || saving}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold py-4 text-base"
                      >
                        {saving ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            <span>Mengirim Review...</span>
                          </div>
                        ) : (
                          <span>Submit Review</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-8">
                  {/* Header with Status */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Informasi SIMLOK</h3>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">Review:</span>
                      {getReviewStatusBadge(submission.review_status)}
                      <span className="text-sm text-gray-500">Status:</span>
                      {getFinalStatusBadge(submission.final_status)}
                    </div>
                  </div>

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
                                Nama Perusahaan Vendor
                              </label>
                              <p className="text-gray-900 py-2 font-medium">{submission.vendor_name}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nomor Telepon Vendor
                              </label>
                              <p className="text-gray-900 py-2">
                                {submission.vendor_phone || (
                                  <span className="text-gray-400 italic">Belum diisi</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Informasi Penanggung Jawab */}
                        <div>
                          <h6 className="text-sm font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">Informasi Penanggung Jawab</h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nama Penanggung Jawab
                              </label>
                              <p className="text-gray-900 py-2 font-medium">{submission.officer_name}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Penanggung Jawab
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
                            Dokumen Dasar / Referensi
                          </label>
                          <div className="bg-white rounded-md p-4 border border-gray-200">
                            <p className="text-gray-900 whitespace-pre-line leading-relaxed">{submission.based_on}</p>
                          </div>
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
                              {new Date(submission.created_at).toLocaleDateString('id-ID')}
                            </div>
                          </div>
                          <div className="bg-white rounded-md p-4 border border-gray-200">
                            <div className="text-sm text-gray-600 mb-2 font-medium">Status Review</div>
                            <div>{getReviewStatusBadge(submission.review_status)}</div>
                          </div>
                          <div className="bg-white rounded-md p-4 border border-gray-200">
                            <div className="text-sm text-gray-600 mb-2 font-medium">Status Persetujuan</div>
                            <div>{getFinalStatusBadge(submission.final_status)}</div>
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
                          Deskripsi Pekerjaan
                        </label>
                        <div className="bg-white p-3 border border-gray-200 rounded-lg">
                          <p className="text-gray-900 whitespace-pre-line">{submission.job_description}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lokasi Kerja
                          </label>
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900 font-medium">{submission.work_location}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Jam Kerja
                          </label>
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900 font-medium">{submission.working_hours || 'Tidak ditentukan'}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Jumlah Pekerja
                          </label>
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900 font-bold text-lg">{submission.worker_count || 0} <span className="text-sm font-normal">orang</span></p>
                          </div>
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
                                <div 
                                  className="text-gray-900 text-sm whitespace-pre-line"
                                  dangerouslySetInnerHTML={{ __html: submission.other_notes }}
                                />
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nomor SIMJA</label>
                        <div className="bg-white p-3 border border-gray-200 rounded-lg">
                          <p className="text-gray-900">{submission.simja_number || '-'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal SIMJA</label>
                        <div className="bg-white p-3 border border-gray-200 rounded-lg">
                          <p className="text-gray-900">
                            {submission.simja_date ? new Date(submission.simja_date).toLocaleDateString('id-ID') : '-'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nomor SIKA</label>
                        <div className="bg-white p-3 border border-gray-200 rounded-lg">
                          <p className="text-gray-900">{submission.sika_number || '-'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal SIKA</label>
                        <div className="bg-white p-3 border border-gray-200 rounded-lg">
                          <p className="text-gray-900">
                            {submission.sika_date ? new Date(submission.sika_date).toLocaleDateString('id-ID') : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* File Documents */}
                    {(submission.simja_document_upload || submission.sika_document_upload) && (
                      <div className="mt-6 space-y-4">
                        <h5 className="text-sm font-medium text-gray-700">File Dokumen</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {submission.simja_document_upload && (
                            <div className="bg-white p-4 border border-gray-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">Dokumen SIMJA</span>
                                <a 
                                  href={submission.simja_document_upload}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  Lihat File
                                </a>
                              </div>
                            </div>
                          )}
                          {submission.sika_document_upload && (
                            <div className="bg-white p-4 border border-gray-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">Dokumen SIKA</span>
                                <a 
                                  href={submission.sika_document_upload}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  Lihat File
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SIMLOK Information (if approved) */}
                  {submission.simlok_number && (
                    <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">Informasi SIMLOK</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nomor SIMLOK</label>
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900 font-bold">{submission.simlok_number}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Terbit</label>
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900">
                              {submission.simlok_date ? new Date(submission.simlok_date).toLocaleDateString('id-ID') : '-'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Periode Pelaksanaan</label>
                          <div className="bg-white p-3 border border-gray-200 rounded-lg">
                            <p className="text-gray-900">
                              {submission.implementation_start_date && submission.implementation_end_date ? (
                                `${new Date(submission.implementation_start_date).toLocaleDateString('id-ID')} - ${new Date(submission.implementation_end_date).toLocaleDateString('id-ID')}`
                              ) : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Workers Tab */}
              {activeTab === 'workers' && (
                <div className="space-y-6">
                  {/* Header dengan jumlah pekerja */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Data Pekerja</h3>
                    <div className="flex items-center space-x-3">
                      <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                        Total: {submission.worker_count || 
                          (submission.worker_names ? submission.worker_names.split('\n').filter(name => name.trim()).length : submission.worker_list.length)
                        } pekerja
                      </span>
                    </div>
                  </div>

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
                            </div>
                          </div>

                          {/* Info Section */}
                          <div className="px-4 pb-4">
                            <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                              {worker.worker_name}
                            </h4>
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
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-white">
          <div>
            {submission?.review_status !== 'PENDING_REVIEW' && (
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
    </div>
  );
};

export default ImprovedReviewerSubmissionDetailModal;