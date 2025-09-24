'use client';

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import DatePicker from '@/components/form/DatePicker';

interface WorkerPhoto {
  id: string;
  worker_name: string;
  worker_photo: string;
  created_at: string;
}

interface SubmissionDetail {
  id: string;
  vendor_name: string;
  based_on: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation: string;
  working_hours: string;
  other_notes: string;
  work_facilities: string;
  simja_number: string;
  simja_date: string | null;
  sika_number: string;
  sika_date: string | null;
  implementation_start_date: string | null;
  implementation_end_date: string | null;
  worker_names: string;
  content: string;
  notes: string;
  signer_position: string;
  signer_name: string;
  review_status: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
  review_note: string;
  final_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  final_note: string;
  created_at: string;
  reviewed_at: string;
  approved_at: string;
  user: {
    id: string;
    officer_name: string;
    email: string;
    vendor_name: string;
  };
  reviewed_by_user?: {
    id: string;
    officer_name: string;
    email: string;
  };
  approved_by_final_user?: {
    id: string;
    officer_name: string;
    email: string;
  };
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
  const [deletingWorker, setDeletingWorker] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  // Form state for editing
  const [formData, setFormData] = useState({
    vendor_name: '',
    based_on: '',
    job_description: '',
    work_location: '',
    implementation: '',
    working_hours: '',
    other_notes: '',
    work_facilities: '',
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
    keterangan: '',
    tanggal_simlok: '',
    pelaksanaan: '',
    lain_lain: '',
    content: '',
    jabatan_signer: 'Head Of Security Region I',
    nama_signer: 'Julianto Santoso'
  });

  // Template helper fields (tidak disimpan ke database)
  const [templateFields, setTemplateFields] = useState({
    tanggal_dari: '',
    tanggal_sampai: '',
    tanggal_simlok: ''
  });

  const fetchSubmissionDetail = async () => {
    if (!submissionId) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/reviewer/simloks/${submissionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch submission details');
      }
      
      const data = await response.json();
      setSubmission(data.submission);
      
      // Initialize form data
      const sub = data.submission;
      setFormData({
        vendor_name: sub.vendor_name || '',
        based_on: sub.based_on || '',
        job_description: sub.job_description || '',
        work_location: sub.work_location || '',
        implementation: sub.implementation || '',
        working_hours: sub.working_hours || '',
        other_notes: sub.other_notes || '',
        work_facilities: sub.work_facilities || '',
        simja_number: sub.simja_number || '',
        simja_date: (sub.simja_date ? new Date(sub.simja_date).toISOString().split('T')[0] : '') as string,
        sika_number: sub.sika_number || '',
        sika_date: (sub.sika_date ? new Date(sub.sika_date).toISOString().split('T')[0] : '') as string,
        implementation_start_date: (sub.implementation_start_date ? new Date(sub.implementation_start_date).toISOString().split('T')[0] : '') as string,
        implementation_end_date: (sub.implementation_end_date ? new Date(sub.implementation_end_date).toISOString().split('T')[0] : '') as string,
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
        if (!dateString) {
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
        keterangan: sub.other_notes || '',
        tanggal_simlok: formatDateForInput(sub.simlok_date),
        pelaksanaan: sub.implementation || '',
        lain_lain: sub.other_notes || '',
        content: sub.content || 'Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis.',
        jabatan_signer: sub.signer_position || 'Head Of Security Region I',
        nama_signer: sub.signer_name || 'Julianto Santoso'
      });

      setTemplateFields({
        tanggal_dari: sub.implementation_start_date ? formatDateForInput(sub.implementation_start_date) : '',
        tanggal_sampai: sub.implementation_end_date ? formatDateForInput(sub.implementation_end_date) : '',
        tanggal_simlok: sub.simlok_date || '',
      });
      
    } catch (err) {
      console.error('Error fetching submission:', err);
      showError('Error', 'Gagal memuat detail pengajuan');
    } finally {
      setLoading(false);
    }
  };

  // Format date function
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  useEffect(() => {
    if (isOpen && submissionId) {
      fetchSubmissionDetail();
    }
  }, [isOpen, submissionId]);

  // Template pelaksanaan
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

  const handleSaveChanges = async () => {
    try {
      setSaving(true);

      // Gabungkan formData dengan approvalForm
      const requestBody = {
        ...formData,
        // Tambahkan data approval form ke requestBody
        other_notes: approvalForm.keterangan,
        content: approvalForm.content,
        signer_position: approvalForm.jabatan_signer,
        signer_name: approvalForm.nama_signer,
        implementation: approvalForm.pelaksanaan,
        // Tambahkan tanggal pelaksanaan jika ada
        ...(templateFields.tanggal_dari && { implementation_start_date: templateFields.tanggal_dari }),
        ...(templateFields.tanggal_sampai && { implementation_end_date: templateFields.tanggal_sampai }),
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
        throw new Error(errorData.error || 'Failed to update submission');
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

  const handleSubmitReview = async () => {
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

      const response = await fetch(`/api/reviewer/simloks/${submissionId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }

      const data = await response.json();
      setSubmission(data.submission);
      showSuccess('Berhasil', 'Review berhasil dikirim');
      onReviewSubmitted();
      
    } catch (err: any) {
      console.error('Error submitting review:', err);
      showError('Error', err.message || 'Gagal mengirim review');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!submission || !window.confirm('Apakah Anda yakin ingin menghapus foto pekerja ini?')) {
      return;
    }

    try {
      setDeletingWorker(workerId);

      const response = await fetch(`/api/reviewer/simloks/${submissionId}/workers/${workerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete worker photo');
      }

      // Remove the worker from the local state
      setSubmission(prevSubmission => {
        if (!prevSubmission) return null;
        return {
          ...prevSubmission,
          worker_list: prevSubmission.worker_list.filter(worker => worker.id !== workerId)
        };
      });

      showSuccess('Berhasil', 'Foto pekerja berhasil dihapus');
      
    } catch (err: any) {
      console.error('Error deleting worker:', err);
      showError('Error', err.message || 'Gagal menghapus foto pekerja');
    } finally {
      setDeletingWorker(null);
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Detail & Review Pengajuan</h2>
            {submission && (
              <p className="text-sm text-gray-500 mt-1">
                {submission.vendor_name} - {submission.user.officer_name}
              </p>
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
        <div className="border-b border-gray-200">
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
        <div className="p-6 max-h-[60vh] overflow-y-auto">
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
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">Data Vendor</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nama Vendor <span className="text-red-500">*</span>
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.vendor_name}
                            onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nama perusahaan vendor"
                          />
                        ) : (
                          <p className="text-gray-900 py-2">{submission.vendor_name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dokumen Dasar <span className="text-red-500">*</span>
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.based_on}
                            onChange={(e) => setFormData({ ...formData, based_on: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Dokumen referensi atau dasar izin"
                          />
                        ) : (
                          <p className="text-gray-900 py-2">{submission.based_on}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Informasi Pekerjaan */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
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
                          <p className="text-gray-900 py-2 whitespace-pre-line">{submission.job_description}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <p className="text-gray-900 py-2">{submission.work_location}</p>
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
                            <p className="text-gray-900 py-2">{submission.working_hours}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dokumen Pendukung */}
                  <div className="bg-gray-50 rounded-lg p-6">
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
                          <p className="text-gray-900 py-2">{submission.simja_number}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tanggal SIMJA
                        </label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={formData.simja_date}
                            onChange={(e) => setFormData({ ...formData, simja_date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900 py-2">
                            {submission.simja_date ? new Date(submission.simja_date).toLocaleDateString('id-ID') : '-'}
                          </p>
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
                          <p className="text-gray-900 py-2">{submission.sika_number}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tanggal SIKA
                        </label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={formData.sika_date}
                            onChange={(e) => setFormData({ ...formData, sika_date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900 py-2">
                            {submission.sika_date ? new Date(submission.sika_date).toLocaleDateString('id-ID') : '-'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Jadwal Pelaksanaan */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">Jadwal Pelaksanaan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tanggal Mulai Pelaksanaan
                        </label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={formData.implementation_start_date}
                            onChange={(e) => setFormData({ ...formData, implementation_start_date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900 py-2">
                            {submission.implementation_start_date ? new Date(submission.implementation_start_date).toLocaleDateString('id-ID') : '-'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tanggal Selesai Pelaksanaan
                        </label>
                        {isEditing ? (
                          <input
                            type="date"
                            value={formData.implementation_end_date}
                            onChange={(e) => setFormData({ ...formData, implementation_end_date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900 py-2">
                            {submission.implementation_end_date ? new Date(submission.implementation_end_date).toLocaleDateString('id-ID') : '-'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Daftar Pekerja */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-gray-900">Data Pekerja</h4>
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {submission.worker_list.length} foto
                      </span>
                    </div>

                    {/* Display worker photos with names */}
                    {submission.worker_list.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {submission.worker_list.map((worker) => (
                            <div
                              key={worker.id}
                              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm relative group"
                            >
                              {/* Photo Section */}
                              <div className="relative p-3">
                                <img
                                  src={worker.worker_photo}
                                  alt={`Foto ${worker.worker_name}`}
                                  className="w-full h-32 rounded-lg object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgODBDMTA4LjI4NCA4MCA5Ni41NjggODggOTYuNTY4IDEwMEM5Ni41NjggMTEyIDEwOC4yODQgMTIwIDEwMCAxMjBDOTEuNzE2IDEyMCA4My40MzIgMTEyIDgzLjQzMiAxMDBDODMuNDMyIDg4IDkxLjcxNiA4MCA5Ni41NjggODBIMTAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTQwIDEzNkMxNDAgMTI2LjMyIDEzMi4wOTEgMTE4IDEyMiAxMThaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                                  }}
                                />
                                
                                {/* Delete Button - Only show if can edit and not already being deleted */}
                                {canEdit && (
                                  <button
                                    onClick={() => handleDeleteWorker(worker.id)}
                                    disabled={deletingWorker === worker.id}
                                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    title="Hapus foto pekerja"
                                  >
                                    {deletingWorker === worker.id ? (
                                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <TrashIcon className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Name Section */}
                              <div className="px-3 pb-3">
                                <div className="text-center">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {worker.worker_name}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Upload: {new Date(worker.created_at).toLocaleDateString('id-ID', {
                                      day: '2-digit',
                                      month: 'short'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">Belum ada foto pekerja</h3>
                        <p className="text-xs text-gray-500">
                          Foto pekerja akan ditampilkan setelah vendor mengupload
                        </p>
                      </div>
                    )}
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
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {submission.worker_list.length} orang
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
                              <img
                                src={worker.worker_photo}
                                alt={`Foto ${worker.worker_name}`}
                                className="w-full h-48 rounded-lg object-cover shadow-sm"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgODBDMTA4LjI4NCA4MCA5Ni41NjggODggOTYuNTY4IDEwMEM5Ni41NjggMTEyIDEwOC4yODQgMTIwIDEwMCAxMjBDOTEuNzE2IDEyMCA4My40MzIgMTEyIDgzLjQzMiAxMDBDODMuNDMyIDg4IDkxLjcxNiA4MCA5Ni41NjggODBIMTAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTQwIDEzNkMxNDAgMTI2LjMyIDEzMi4wOTEgMTE4IDEyMiAxMThaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                                }}
                              />
                              <div className="absolute inset-0 rounded-lg bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200"></div>
                              
                              {/* Delete Button - Only show if can edit */}
                              {canEdit && (
                                <button
                                  onClick={() => handleDeleteWorker(worker.id)}
                                  disabled={deletingWorker === worker.id}
                                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                  title="Hapus foto pekerja"
                                >
                                  {deletingWorker === worker.id ? (
                                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <TrashIcon className="w-4 h-4" />
                                  )}
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
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Review Pengajuan</h3>
                    
                    {submission.review_status !== 'PENDING_REVIEW' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Review Sudah Diberikan</span>
                        </div>
                        <div className="text-sm text-blue-700">
                          <p>Status: {getStatusBadge(submission.review_status)}</p>
                          {submission.review_note && (
                            <p className="mt-2">Catatan: {submission.review_note}</p>
                          )}
                          {submission.reviewed_by_user && (
                            <p className="mt-1">
                              Oleh: {submission.reviewed_by_user.officer_name} pada{' '}
                              {new Date(submission.reviewed_at).toLocaleDateString('id-ID')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {canEdit && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Status Review
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="review_status"
                                value="MEETS_REQUIREMENTS"
                                checked={reviewData.review_status === 'MEETS_REQUIREMENTS'}
                                onChange={(e) => setReviewData({ ...reviewData, review_status: e.target.value as any })}
                                className="mr-3"
                              />
                              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                              <span className="text-green-600 font-medium">Memenuhi Syarat</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="review_status"
                                value="NOT_MEETS_REQUIREMENTS"
                                checked={reviewData.review_status === 'NOT_MEETS_REQUIREMENTS'}
                                onChange={(e) => setReviewData({ ...reviewData, review_status: e.target.value as any })}
                                className="mr-3"
                              />
                              <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
                              <span className="text-red-600 font-medium">Tidak Memenuhi Syarat</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Catatan Review <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={reviewData.review_note}
                            onChange={(e) => setReviewData({ ...reviewData, review_note: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Jelaskan alasan review Anda..."
                            required
                          />
                          {reviewData.review_status && !reviewData.review_note.trim() && (
                            <p className="text-red-500 text-sm mt-1">Catatan review wajib diisi</p>
                          )}
                        </div>

                        <Button
                          onClick={handleSubmitReview}
                          variant="primary"
                          disabled={!reviewData.review_status || !reviewData.review_note.trim() || saving}
                          className="w-full"
                        >
                          {saving ? 'Mengirim Review...' : 'Kirim Review'}
                        </Button>
                      </div>
                    )}

                    {/* Proses Approval Form - Untuk persiapan data approval */}
                    <div className="border-t border-gray-200 pt-6">
                      <div className="mb-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Persiapan Data Approval</h4>
                        <p className="text-sm text-gray-600">
                          Isi form berikut untuk mempersiapkan data yang diperlukan saat proses approval oleh admin.
                        </p>
                      </div>

                      <div className="space-y-6">
                        {/* Tanggal SIMLOK */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tanggal SIMLOK
                          </label>
                          <DatePicker
                            value={approvalForm.tanggal_simlok}
                            onChange={(value) => setApprovalForm(prev => ({ ...prev, tanggal_simlok: value }))}
                            placeholder="Pilih tanggal SIMLOK"
                          />
                        </div>

                        {/* Tanggal Pelaksanaan */}
                        <div className="space-y-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Tanggal Pelaksanaan
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
                              onChange={(e) => setApprovalForm(prev => ({ ...prev, pelaksanaan: e.target.value }))}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Contoh: Terhitung mulai tanggal 15 Januari 2024 sampai 20 Januari 2024. Termasuk hari Sabtu, Minggu dan hari libur lainnya."
                            />
                          </div>
                        </div>

                        {/* Jabatan Signer */}
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

                        {/* Nama Signer */}
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

                        {/* Lain-lain */}
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

                        {/* Content */}
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

                        {/* Keterangan */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Keterangan
                            <span className="text-xs text-gray-500 ml-1">(Catatan dari reviewer)</span>
                          </label>
                          <textarea
                            value={approvalForm.keterangan}
                            onChange={(e) => setApprovalForm(prev => ({ ...prev, keterangan: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Tambahkan catatan untuk persiapan approval..."
                          />
                        </div>

                        {/* Save Button */}
                        <div className="pt-4">
                          <Button
                            onClick={handleSaveChanges}
                            disabled={saving}
                            variant="secondary"
                            size="md"
                            className="w-full"
                          >
                            {saving ? 'Menyimpan...' : 'Simpan Persiapan Approval'}
                          </Button>
                        </div>

                        {/* Info Box */}
                        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
                          <p className="font-medium mb-1">Catatan:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Data ini akan digunakan sebagai template saat admin melakukan approval</li>
                            <li>Template akan otomatis tergenerate berdasarkan tanggal yang dipilih</li>
                            <li>Semua field bersifat opsional dan dapat diubah kembali oleh admin</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {!canEdit && submission.final_status !== 'PENDING_APPROVAL' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <XCircleIcon className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">Info</h3>
                            <div className="mt-2 text-sm text-blue-700">
                              <p>Review tidak dapat diubah karena pengajuan sudah difinalisasi oleh approver.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button onClick={onClose} variant="outline">
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewerSubmissionDetailModal;