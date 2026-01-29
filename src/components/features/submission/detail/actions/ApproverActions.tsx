'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import Input from '@/components/ui/input/Input';
import DatePicker from '@/components/ui/input/DatePicker';
import { useToast } from '@/hooks/useToast';
import { useServerTime } from '@/hooks/useServerTime';
import type { BaseSubmissionDetail } from '../../SubmissionDetailShared';
import { generateSimlokNumber } from '../../SubmissionDetailShared';

interface ApproverActionsProps {
  submission: BaseSubmissionDetail;
  onSuccess: () => void;
}

export default function ApproverActions({
  submission,
  onSuccess,
}: ApproverActionsProps) {
  const { showSuccess, showError } = useToast();
  const { getCurrentDate, isLoaded: serverTimeLoaded } = useServerTime();
  const [saving, setSaving] = useState(false);

  // Approval form state
  const [approvalData, setApprovalData] = useState({
    approval_status: '' as 'APPROVED' | 'REJECTED' | '',
    simlok_number: '',
    simlok_date: '',
    note_for_vendor: '',
  });

  // Initialize from submission
  useEffect(() => {
    if (submission) {
      const parseSimlokDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const jakartaStr = date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
        const jakartaDate = new Date(jakartaStr);
        const year = jakartaDate.getFullYear();
        const month = String(jakartaDate.getMonth() + 1).padStart(2, '0');
        const day = String(jakartaDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      setApprovalData({
        approval_status: submission.approval_status === 'PENDING_APPROVAL' || submission.approval_status === 'PENDING_REVIEW' ? '' : submission.approval_status,
        simlok_number: submission.simlok_number || '',
        simlok_date: parseSimlokDate(submission.simlok_date || null) || (serverTimeLoaded ? getCurrentDate() : ''),
        note_for_vendor: submission.note_for_vendor || '',
      });

      // Auto-fill SIMLOK number jika status APPROVED dan belum ada nomor
      if (submission.approval_status === 'APPROVED' && !submission.simlok_number) {
        generateSimlokNumber().then((simlokNumber) => {
          setApprovalData(prev => ({
            ...prev,
            simlok_number: simlokNumber,
          }));
        });
      }
    }
  }, [submission, serverTimeLoaded, getCurrentDate]);

  // Update simlok_date with server time once loaded
  useEffect(() => {
    if (serverTimeLoaded && approvalData.simlok_date === '' && submission?.approval_status === 'PENDING_APPROVAL') {
      setApprovalData(prev => ({
        ...prev,
        simlok_date: getCurrentDate(),
      }));
    }
  }, [serverTimeLoaded, getCurrentDate, approvalData.simlok_date, submission?.approval_status]);

  // Handle status change with auto-fill
  const handleStatusChange = async (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'APPROVED') {
      const simlokNumber = await generateSimlokNumber();
      setApprovalData(prev => ({
        ...prev,
        approval_status: status,
        simlok_number: prev.simlok_number || simlokNumber,
        simlok_date: prev.simlok_date || (serverTimeLoaded ? getCurrentDate() : ''),
      }));
    } else {
      // Reset SIMLOK fields jika status REJECTED
      setApprovalData(prev => ({
        ...prev,
        approval_status: status,
        simlok_number: '',
        simlok_date: '',
      }));
    }
  };

  const handleSubmitApproval = useCallback(async () => {
    if (!approvalData.approval_status) {
      showError('Status Persetujuan Belum Dipilih', 'Silakan pilih status persetujuan terlebih dahulu sebelum mengirim.');
      return;
    }

    if (approvalData.approval_status === 'APPROVED' && !approvalData.simlok_number.trim()) {
      showError('Nomor SIMLOK Belum Diisi', 'Nomor SIMLOK wajib diisi untuk menyetujui pengajuan.');
      return;
    }

    if (approvalData.approval_status === 'APPROVED' && !approvalData.simlok_date.trim()) {
      showError('Tanggal SIMLOK Belum Diisi', 'Tanggal SIMLOK wajib diisi untuk menyetujui pengajuan.');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/submissions/${submission.id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval_status: approvalData.approval_status,
          simlok_number: approvalData.approval_status === 'APPROVED' ? approvalData.simlok_number.trim() : undefined,
          simlok_date: approvalData.approval_status === 'APPROVED' && approvalData.simlok_date ? approvalData.simlok_date : undefined,
          note_for_vendor: approvalData.note_for_vendor.trim() || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          showError('Pengajuan Tidak Ditemukan', 'Pengajuan sudah dihapus oleh vendor');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengirim persetujuan');
      }

      showSuccess('Berhasil', `Pengajuan berhasil ${approvalData.approval_status === 'APPROVED' ? 'disetujui' : 'ditolak'}`);
      onSuccess();
    } catch (err: any) {
      console.error('Error submitting approval:', err);
      showError('Error', err.message || 'Gagal menyimpan persetujuan');
    } finally {
      setSaving(false);
    }
  }, [submission, approvalData, showSuccess, showError, onSuccess]);

  const canApprove = submission?.approval_status === 'PENDING_APPROVAL';

  if (!canApprove) {
    return null; // Already approved/rejected
  }

  return (
    <div className="space-y-6">
      {/* Approval Status Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Status Persetujuan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handleStatusChange('APPROVED')}
            className={`p-4 rounded-lg border-2 transition-all ${
              approvalData.approval_status === 'APPROVED'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-200'
            }`}
          >
            <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-center font-medium text-gray-900">Setuju</div>
          </button>
          <button
            onClick={() => handleStatusChange('REJECTED')}
            className={`p-4 rounded-lg border-2 transition-all ${
              approvalData.approval_status === 'REJECTED'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-red-200'
            }`}
          >
            <XCircleIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-center font-medium text-gray-900">Tolak</div>
          </button>
        </div>
      </div>

      {/* SIMLOK Number & Date (only for APPROVED) */}
      {approvalData.approval_status === 'APPROVED' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Informasi SIMLOK</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor SIMLOK <span className="text-red-500">*</span>
              </label>
              <Input
                value={approvalData.simlok_number}
                onChange={(e) => setApprovalData(prev => ({ ...prev, simlok_number: e.target.value }))}
                placeholder="Contoh: SIMLOK/2024/001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal SIMLOK <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={approvalData.simlok_date}
                onChange={(value) => setApprovalData(prev => ({ ...prev, simlok_date: value }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes for Vendor */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Catatan untuk Vendor (Opsional)</h3>
        <textarea
          value={approvalData.note_for_vendor}
          onChange={(e) => setApprovalData(prev => ({ ...prev, note_for_vendor: e.target.value }))}
          rows={4}
          placeholder="Tulis catatan untuk vendor..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmitApproval}
          variant="primary"
          size="lg"
          disabled={saving || !approvalData.approval_status}
        >
          {saving ? 'Mengirim...' : 'Kirim Persetujuan'}
        </Button>
      </div>
    </div>
  );
}
