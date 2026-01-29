'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import DateRangePicker from '@/components/ui/input/DateRangePicker';
import TimeRangePicker from '@/components/ui/input/TimeRangePicker';
import { useToast } from '@/hooks/useToast';
import { useImplementationDates } from '@/hooks/useImplementationDates';
import type { BaseSubmissionDetail } from '../../SubmissionDetailShared';
import { formatDate } from '../../SubmissionDetailShared';
import { hasWeekendInRange } from '@/utils/date/dateHelpers';

interface ReviewerActionsProps {
  submission: BaseSubmissionDetail;
  onSuccess: () => void;
}

export default function ReviewerActions({
  submission,
  onSuccess,
}: ReviewerActionsProps) {
  const { showSuccess, showError } = useToast();
  const [saving, setSaving] = useState(false);

  // Review form state
  const [reviewData, setReviewData] = useState({
    review_status: '' as 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS' | '',
    review_note: '', // untuk approver
    final_note: '', // untuk vendor
  });

  // Implementation dates
  const [implementationStartDate, setImplementationStartDate] = useState('');
  const [implementationEndDate, setImplementationEndDate] = useState('');
  
  // Working hours
  const [workingHours, setWorkingHours] = useState('08:00 WIB - 17:00 WIB');
  const [holidayWorkingHours, setHolidayWorkingHours] = useState('');
  const [showHolidayWorkingHours, setShowHolidayWorkingHours] = useState(false);

  // Template text
  const [approvalForm, setApprovalForm] = useState({
    content: 'Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis.',
    pelaksanaan: '',
  });

  // Use implementation dates hook
  const implementationDatesHook = useImplementationDates({
    supportingDoc1Type: submission?.supporting_doc1_type ?? '',
    supportingDoc1Number: submission?.supporting_doc1_number ?? '',
    supportingDoc1Date: submission?.supporting_doc1_date ?? '',
    supportingDoc2Type: submission?.supporting_doc2_type ?? '',
    supportingDoc2Number: submission?.supporting_doc2_number ?? '',
    supportingDoc2Date: submission?.supporting_doc2_date ?? '',
  });

  // Initialize from submission
  useEffect(() => {
    if (submission) {
      setReviewData({
        review_status: submission.review_status === 'PENDING_REVIEW' ? '' : submission.review_status,
        review_note: submission.note_for_approver || '',
        final_note: submission.note_for_vendor || '',
      });

      setApprovalForm({
        content: submission.content || 'Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis.',
        pelaksanaan: submission.implementation || '',
      });

      setWorkingHours(submission.working_hours || '08:00 WIB - 17:00 WIB');
      setHolidayWorkingHours(submission.holiday_working_hours || '');
      setImplementationStartDate(submission.implementation_start_date || '');
      setImplementationEndDate(submission.implementation_end_date || '');

      // Check if there's weekend in existing date range
      if (submission.implementation_start_date && submission.implementation_end_date) {
        const hasWeekend = hasWeekendInRange(
          submission.implementation_start_date,
          submission.implementation_end_date
        );
        setShowHolidayWorkingHours(hasWeekend);
      }
    }
  }, [submission]);

  // Auto-fill pelaksanaan when implementation dates are set
  useEffect(() => {
    if (implementationDatesHook.dates.startDate && implementationDatesHook.dates.endDate) {
      const pelaksanaanTemplate = `Terhitung mulai tanggal ${formatDate(implementationDatesHook.dates.startDate)} sampai ${formatDate(implementationDatesHook.dates.endDate)}. Termasuk hari Sabtu, Minggu dan hari libur lainnya.`;

      setApprovalForm(prev => ({
        ...prev,
        pelaksanaan: pelaksanaanTemplate,
      }));

      const hasWeekend = hasWeekendInRange(
        implementationDatesHook.dates.startDate,
        implementationDatesHook.dates.endDate
      );

      setShowHolidayWorkingHours(hasWeekend);

      if (!hasWeekend) {
        setHolidayWorkingHours('');
      }
    }
  }, [implementationDatesHook.dates.startDate, implementationDatesHook.dates.endDate]);

  // Clear unnecessary notes when review status changes
  useEffect(() => {
    if (reviewData.review_status === 'MEETS_REQUIREMENTS') {
      setReviewData(prev => ({ ...prev, final_note: '' }));
    } else if (reviewData.review_status === 'NOT_MEETS_REQUIREMENTS') {
      setReviewData(prev => ({ ...prev, review_note: '' }));
    }
  }, [reviewData.review_status]);

  const handleSubmitReview = useCallback(async () => {
    if (!reviewData.review_status) {
      showError('Status Review Belum Dipilih', 'Silakan pilih status review terlebih dahulu sebelum mengirim.');
      return;
    }

    if (reviewData.review_status === 'MEETS_REQUIREMENTS' && !reviewData.review_note.trim()) {
      showError('Catatan Approver Belum Diisi', 'Catatan untuk approver wajib diisi ketika pengajuan memenuhi syarat.');
      return;
    }

    if (reviewData.review_status === 'NOT_MEETS_REQUIREMENTS' && !reviewData.final_note.trim()) {
      showError('Catatan Vendor Belum Diisi', 'Catatan untuk vendor wajib diisi ketika pengajuan tidak memenuhi syarat.');
      return;
    }

    const finalStartDate = implementationStartDate || implementationDatesHook.dates.startDate;
    const finalEndDate = implementationEndDate || implementationDatesHook.dates.endDate;

    if (!finalStartDate || !finalStartDate.trim()) {
      showError('Tanggal Mulai Belum Diisi', 'Tanggal mulai pelaksanaan wajib diisi sebelum mengirim review.');
      return;
    }

    if (!finalEndDate || !finalEndDate.trim()) {
      showError('Tanggal Selesai Belum Diisi', 'Tanggal selesai pelaksanaan wajib diisi sebelum mengirim review.');
      return;
    }

    const startDate = new Date(finalStartDate);
    const endDate = new Date(finalEndDate);

    if (endDate < startDate) {
      showError('Tanggal Tidak Valid', 'Tanggal selesai pelaksanaan tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    try {
      setSaving(true);

      // Save implementation dates and template data first
      const updatePayload = {
        implementation_start_date: finalStartDate,
        implementation_end_date: finalEndDate,
        implementation: approvalForm.pelaksanaan,
        content: approvalForm.content,
        working_hours: workingHours,
        holiday_working_hours: holidayWorkingHours || null,
      };

      const saveResponse = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!saveResponse.ok) {
        throw new Error('Gagal menyimpan template approval');
      }

      // Submit review
      const reviewPayload: any = {
        review_status: reviewData.review_status,
        working_hours: workingHours,
        holiday_working_hours: holidayWorkingHours || null,
        implementation: approvalForm.pelaksanaan,
        content: approvalForm.content,
        implementation_start_date: finalStartDate,
        implementation_end_date: finalEndDate,
      };

      if (reviewData.review_status === 'MEETS_REQUIREMENTS') {
        reviewPayload.note_for_approver = reviewData.review_note;
        reviewPayload.note_for_vendor = '';
      } else if (reviewData.review_status === 'NOT_MEETS_REQUIREMENTS') {
        reviewPayload.note_for_vendor = reviewData.final_note;
        reviewPayload.note_for_approver = '';
      }

      const reviewResponse = await fetch(`/api/submissions/${submission.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewPayload),
      });

      if (!reviewResponse.ok) {
        const errorData = await reviewResponse.json();
        throw new Error(errorData.error || 'Gagal mengirim review');
      }

      showSuccess('Berhasil', 'Review berhasil dikirim dan template approval tersimpan');
      onSuccess();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      showError('Error', err.message || 'Gagal mengirim review');
    } finally {
      setSaving(false);
    }
  }, [
    submission,
    reviewData,
    implementationStartDate,
    implementationEndDate,
    implementationDatesHook.dates,
    approvalForm,
    workingHours,
    holidayWorkingHours,
    showSuccess,
    showError,
    onSuccess,
  ]);

  const canReview = submission.review_status === 'PENDING_REVIEW';

  if (!canReview) {
    return null; // Already reviewed
  }

  return (
    <div className="space-y-6">
      {/* Review Status Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Status Review</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setReviewData(prev => ({ ...prev, review_status: 'MEETS_REQUIREMENTS' }))}
            className={`p-4 rounded-lg border-2 transition-all ${
              reviewData.review_status === 'MEETS_REQUIREMENTS'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-200'
            }`}
          >
            <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-center font-medium text-gray-900">Memenuhi Syarat</div>
          </button>
          <button
            onClick={() => setReviewData(prev => ({ ...prev, review_status: 'NOT_MEETS_REQUIREMENTS' }))}
            className={`p-4 rounded-lg border-2 transition-all ${
              reviewData.review_status === 'NOT_MEETS_REQUIREMENTS'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-red-200'
            }`}
          >
            <XCircleIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-center font-medium text-gray-900">Tidak Memenuhi Syarat</div>
          </button>
        </div>
      </div>

      {/* Implementation Dates */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tanggal Pelaksanaan</h3>
        <DateRangePicker
          startDate={implementationDatesHook.dates.startDate}
          endDate={implementationDatesHook.dates.endDate}
          onStartDateChange={(date) => {
            implementationDatesHook.updateDates({ 
              startDate: date, 
              endDate: implementationDatesHook.dates.endDate 
            });
            setImplementationStartDate(date);
          }}
          onEndDateChange={(date) => {
            implementationDatesHook.updateDates({ 
              startDate: implementationDatesHook.dates.startDate,
              endDate: date 
            });
            setImplementationEndDate(date);
          }}
        />
      </div>

      {/* Working Hours */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Jam Kerja</h3>
        <div className="space-y-4">
          <TimeRangePicker
            value={workingHours}
            onChange={setWorkingHours}
            label="Jam Kerja Normal"
          />
          {showHolidayWorkingHours && (
            <TimeRangePicker
              value={holidayWorkingHours}
              onChange={setHolidayWorkingHours}
              label="Jam Kerja Hari Libur"
            />
          )}
        </div>
      </div>

      {/* Template Text */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Template Approval</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Isi</label>
            <textarea
              value={approvalForm.content}
              onChange={(e) => setApprovalForm(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pelaksanaan</label>
            <textarea
              value={approvalForm.pelaksanaan}
              onChange={(e) => setApprovalForm(prev => ({ ...prev, pelaksanaan: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      {reviewData.review_status === 'MEETS_REQUIREMENTS' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Catatan untuk Approver</h3>
          <textarea
            value={reviewData.review_note}
            onChange={(e) => setReviewData(prev => ({ ...prev, review_note: e.target.value }))}
            rows={4}
            placeholder="Tulis catatan untuk approver..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {reviewData.review_status === 'NOT_MEETS_REQUIREMENTS' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Catatan untuk Vendor</h3>
          <textarea
            value={reviewData.final_note}
            onChange={(e) => setReviewData(prev => ({ ...prev, final_note: e.target.value }))}
            rows={4}
            placeholder="Tulis catatan untuk vendor..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmitReview}
          variant="primary"
          size="lg"
          disabled={saving || !reviewData.review_status}
        >
          {saving ? 'Mengirim...' : 'Kirim Review'}
        </Button>
      </div>
    </div>
  );
}
