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
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Mulai Pelaksanaan
          </label>
          <DatePicker
            value={localRange.startDate}
            onChange={handleStartChange}
            disabled={disabled}
            placeholder="Pilih tanggal mulai"
            className="w-full"
          />
          {errors.start && (
            <div className="mt-1 text-sm text-red-600">{errors.start}</div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tanggal Selesai Pelaksanaan
          </label>
          <DatePicker
            value={localRange.endDate}
            onChange={handleEndChange}
            disabled={disabled}
            placeholder="Pilih tanggal selesai"
            className="w-full"
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
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                    <h4 className="text-base font-medium text-gray-900 mb-4">Jadwal Pelaksanaan</h4>
                    <ImprovedDateRangePicker
                      value={implementationDatesHook.dates}
                      onChange={implementationDatesHook.updateDates}
                      className="mb-4"
                    />
                    
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

              {/* Other tabs content would go here */}
              {activeTab === 'details' && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Detail submission content will be implemented here</p>
                </div>
              )}

              {activeTab === 'workers' && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Worker data content will be implemented here</p>
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