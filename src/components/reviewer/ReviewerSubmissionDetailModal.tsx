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
import SimlokPdfModal from '@/components/common/SimlokPdfModal';

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
  const [isEditingWorkers, setIsEditingWorkers] = useState(false);
  const [hasWorkerChanges, setHasWorkerChanges] = useState(false);
  const [workersToDelete, setWorkersToDelete] = useState<string[]>([]);
  const [originalWorkerList, setOriginalWorkerList] = useState<WorkerPhoto[]>([]);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  // Removed unused deletingWorker state since we now use deferred deletion
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
        worker_count: sub.worker_count || 0,
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

  const handleViewPdf = () => {
    setIsPdfModalOpen(true);
  };

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
      const requestBody = {
        ...formData,
        other_notes: approvalForm.keterangan,
        content: approvalForm.content,
        signer_position: approvalForm.jabatan_signer,
        signer_name: approvalForm.nama_signer,
        implementation: approvalForm.pelaksanaan,
        ...(templateFields.tanggal_dari && { implementation_start_date: templateFields.tanggal_dari }),
        ...(templateFields.tanggal_sampai && { implementation_end_date: templateFields.tanggal_sampai }),
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
        throw new Error(errorData.error || 'Failed to submit review');
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
          throw new Error(errorData.error || 'Failed to delete worker photo');
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
                            <p className="text-gray-900 py-2">{submission.worker_count || 0} orang</p>
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
                            <div className={`mt-1 font-medium ${
                              (formData.worker_count || submission.worker_count || 0) > submission.worker_list.length 
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
                              ✓ Jumlah sudah sesuai
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
                <div className="space-y-8">
                  {/* Header Section */}
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Review Pengajuan</h3>
                    <p className="text-gray-600">
                      Berikan penilaian dan catatan untuk pengajuan SIMLOK ini
                    </p>
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
                          <div className="mt-3 text-sm text-gray-500">
                            Direview pada: {submission.reviewed_at ? formatDate(submission.reviewed_at) : '-'}
                            {submission.reviewed_by_user && (
                              <span> oleh {submission.reviewed_by_user.officer_name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Review Form */}
                  {canEdit && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <div className="space-y-6">
                        {/* Status Selection */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Hasil Review</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div 
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                                reviewData.review_status === 'MEETS_REQUIREMENTS' 
                                  ? 'border-green-500 bg-green-50' 
                                  : 'border-gray-200 hover:border-green-300 bg-white'
                              }`}
                              onClick={() => setReviewData({ ...reviewData, review_status: 'MEETS_REQUIREMENTS' })}
                            >
                              <div className="flex items-center space-x-3">
                                <input
                                  type="radio"
                                  name="review_status"
                                  value="MEETS_REQUIREMENTS"
                                  checked={reviewData.review_status === 'MEETS_REQUIREMENTS'}
                                  onChange={(e) => setReviewData({ ...reviewData, review_status: e.target.value as any })}
                                  className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                    <span className="text-green-700 font-semibold">Memenuhi Syarat</span>
                                  </div>
                                  <p className="text-sm text-green-600 mt-1">Pengajuan telah sesuai dengan persyaratan</p>
                                </div>
                              </div>
                            </div>

                            <div 
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                                reviewData.review_status === 'NOT_MEETS_REQUIREMENTS' 
                                  ? 'border-red-500 bg-red-50' 
                                  : 'border-gray-200 hover:border-red-300 bg-white'
                              }`}
                              onClick={() => setReviewData({ ...reviewData, review_status: 'NOT_MEETS_REQUIREMENTS' })}
                            >
                              <div className="flex items-center space-x-3">
                                <input
                                  type="radio"
                                  name="review_status"
                                  value="NOT_MEETS_REQUIREMENTS"
                                  checked={reviewData.review_status === 'NOT_MEETS_REQUIREMENTS'}
                                  onChange={(e) => setReviewData({ ...reviewData, review_status: e.target.value as any })}
                                  className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <XCircleIcon className="h-5 w-5 text-red-600" />
                                    <span className="text-red-700 font-semibold">Tidak Memenuhi Syarat</span>
                                  </div>
                                  <p className="text-sm text-red-600 mt-1">Pengajuan perlu perbaikan atau penyesuaian</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Catatan Review */}
                        <div>
                          <h5 className="text-base font-semibold text-gray-900 mb-3">Catatan Review</h5>
                          <div className="space-y-4">
                            {/* Catatan untuk Approver */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Catatan untuk Approver <span className="text-red-500">*</span>
                              </label>
                              <p className="text-xs text-gray-500 mb-2">
                                Catatan ini akan dibaca oleh Approver untuk membantu proses persetujuan
                              </p>
                              <textarea
                                value={reviewData.review_note}
                                onChange={(e) => setReviewData({ ...reviewData, review_note: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Berikan penjelasan detail mengenai hasil review untuk membantu Approver dalam pengambilan keputusan..."
                                required
                              />
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
                    </div>
                  )}

                  {/* Persiapan Approval Form - Hanya untuk yang bisa edit */}
                  {canEdit && (
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6 mt-8">
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Persiapan Template Approval</h3>
                        <p className="text-gray-600 text-sm">
                          Lengkapi data berikut untuk mempersiapkan template approval. Data ini akan membantu admin saat melakukan approval final.
                        </p>
                      </div>

                      <div className="space-y-6">
                        {/* Tanggal Pelaksanaan */}
                        <div className="space-y-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Tanggal Pelaksanaan
                            <span className="text-xs text-gray-500 ml-1">(Jadwal pelaksanaan kegiatan)</span>
                          </label>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                        {/* Save Button - Removed from here, will be combined at the bottom */}

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

                      {/* Combined Submit Button */}
                      <div className="mt-8 pt-6 border-t border-gray-200">
                        <Button
                          onClick={handleSubmitReviewAndSave}
                          variant="primary"
                          disabled={!reviewData.review_status || !reviewData.review_note.trim() || saving}
                          className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-semibold py-3 text-base transition-all duration-200"
                        >
                          {saving ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Mengirim Review & Menyimpan Template...
                            </div>
                          ) : (
                            'Kirim Review & Simpan Template Approval'
                          )}
                        </Button>
                        
                        <p className="text-xs text-gray-500 mt-3 text-center">
                          Tombol ini akan mengirim review dan menyimpan template approval sekaligus
                        </p>
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
            {/* Tampilkan tombol PDF setelah submission sudah di-review dan ada simlok_number */}
            {submission?.review_status !== 'PENDING_REVIEW' && submission?.simlok_number && (
              <Button onClick={handleViewPdf} variant="primary" size="sm">
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                Lihat PDF SIMLOK
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
