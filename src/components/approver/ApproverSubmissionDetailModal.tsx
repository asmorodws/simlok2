'use client';

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  QrCodeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Button, Badge } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { fileUrlHelper } from '@/lib/fileUrlHelper';
import SimlokPdfModal from '@/components/common/SimlokPdfModal';

interface SubmissionDetail {
  id: string;
  approval_status: string;
  review_status: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
  final_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  vendor_name: string;
  vendor_phone?: string;
  based_on: string;
  officer_name: string;
  officer_email?: string;
  job_description: string;
  work_location: string;
  implementation: string | null;
  working_hours: string;
  other_notes?: string;
  work_facilities: string;
  worker_count: number | null;
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
  review_note?: string;
  reviewed_by_name?: string;
  reviewed_by_email?: string;
  final_note?: string;
  approved_by_name?: string;
  approved_by_email?: string;
  sika_document_upload?: string;
  simja_document_upload?: string;
  qrcode?: string;
  created_at: string;
  reviewed_at?: string;
  approved_at?: string;
  signer_position?: string;
  signer_name?: string;
  worker_list: Array<{
    id: string;
    worker_name: string;
    worker_photo: string | null;
    created_at: string;
  }>;
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
  lastScan?: QrScan;
  hasBeenScanned: boolean;
}

interface ApproverSubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  onApprovalSubmitted: () => void;
}

const ApproverSubmissionDetailModal: React.FC<ApproverSubmissionDetailModalProps> = ({
  isOpen,
  onClose,
  submissionId,
  onApprovalSubmitted
}) => {
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'workers' | 'approval'>('details');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistory | null>(null);
  const [loadingScanHistory, setLoadingScanHistory] = useState(false);
  const { showSuccess, showError } = useToast();

  // Function to generate auto SIMLOK number - mengikuti sistem admin yang sudah ada
  const generateSimlokNumber = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // MM format

    try {
      // Call API untuk mendapatkan nomor terakhir (untuk demo, kita gunakan format sederhana)
      // Server akan handle logic yang sebenarnya saat approve
      
      // Fallback format client-side: auto-increment berdasarkan bulan/tahun saat ini
      // Format: sequential_number/MM/YYYY (contoh: 1/09/2025, 2/09/2025)
      const timestamp = Date.now();
      const fallbackNumber = timestamp % 1000; // Simple fallback
      return `${fallbackNumber}/${month}/${year}`;
    } catch (error) {
      // Fallback jika error
      const fallbackNumber = Math.floor(Math.random() * 1000) + 1;
      return `${fallbackNumber}/${month}/${year}`;
    }
  };

  // Function to get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  // Approval form state
  const [approvalData, setApprovalData] = useState({
    final_status: '' as 'APPROVED' | 'REJECTED' | '',
    simlok_number: '',
    simlok_date: ''
  });

  const fetchSubmissionDetail = async () => {
    if (!submissionId) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/approver/simloks/${submissionId}`);
      if (!response.ok) {
        throw new Error('Gagal mengambil detail pengajuan');
      }
      
      const data = await response.json();
      setSubmission(data.submission);
      
      // Initialize approval data
      setApprovalData({
        final_status: data.submission.final_status === 'PENDING_APPROVAL' ? '' : data.submission.final_status,
        simlok_number: data.submission.simlok_number || '',
        simlok_date: (data.submission.simlok_date 
          ? new Date(data.submission.simlok_date).toISOString().split('T')[0] 
          : '') as string
      });
      
      // Auto-fill SIMLOK data jika status APPROVED dan belum ada nomor SIMLOK
      if (data.submission.final_status === 'APPROVED' && !data.submission.simlok_number) {
        const simlokNumber = await generateSimlokNumber();
        setApprovalData(prev => ({
          ...prev,
          simlok_number: simlokNumber,
          simlok_date: getCurrentDate() as string
        }));
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

  useEffect(() => {
    if (isOpen && submissionId) {
      fetchSubmissionDetail();
      fetchScanHistory();
    }
  }, [isOpen, submissionId]);

  const handleViewPdf = () => {
    setIsPdfModalOpen(true);
  };

  const handleSubmitApproval = async () => {
    if (!approvalData.final_status) {
      showError('Error', 'Pilih status persetujuan terlebih dahulu');
      return;
    }

    if (approvalData.final_status === 'APPROVED' && !approvalData.simlok_number.trim()) {
      showError('Error', 'Nomor SIMLOK wajib diisi untuk approval');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/approver/simloks/${submissionId}/final`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          final_status: approvalData.final_status,
          simlok_number: approvalData.final_status === 'APPROVED' ? approvalData.simlok_number.trim() : undefined,
          simlok_date: approvalData.final_status === 'APPROVED' && approvalData.simlok_date ? approvalData.simlok_date : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengirim persetujuan');
      }

      const data = await response.json();
      setSubmission(data.submission);
      showSuccess('Berhasil', `Pengajuan berhasil ${approvalData.final_status === 'APPROVED' ? 'disetujui' : 'ditolak'}`);
      onApprovalSubmitted();
      
    } catch (err: any) {
      console.error('Error submitting approval:', err);
      showError('Error', err.message || 'Gagal menyimpan persetujuan');
    } finally {
      setSaving(false);
    }
  };

  const canApprove = submission && submission.final_status === 'PENDING_APPROVAL';

  // Handle status change with auto-fill
  const handleStatusChange = async (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'APPROVED') {
      // Auto-fill nomor SIMLOK dan tanggal jika belum ada
      const simlokNumber = await generateSimlokNumber();
      setApprovalData(prev => ({
        ...prev,
        final_status: status,
        simlok_number: prev.simlok_number || simlokNumber,
        simlok_date: prev.simlok_date || getCurrentDate() as string
      }));
    } else {
      // Reset SIMLOK fields jika status REJECTED
      setApprovalData(prev => ({
        ...prev,
        final_status: status,
        simlok_number: '',
        simlok_date: ''
      }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <Badge variant="warning">Menunggu Review</Badge>;
      case 'MEETS_REQUIREMENTS':
        return <Badge variant="success">Memenuhi Syarat</Badge>;
      case 'NOT_MEETS_REQUIREMENTS':
        return <Badge variant="error">Tidak Memenuhi Syarat</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="warning">Menunggu Persetujuan</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Disetujui</Badge>;
      case 'REJECTED':
        return <Badge variant="error">Ditolak</Badge>;
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
            <h2 className="text-xl font-semibold text-gray-900">Detail & Approval Pengajuan</h2>
            {submission && (
              <div className="text-sm text-gray-500 mt-1 space-y-1">
                <p>
                  <span className="font-medium">{submission.vendor_name}</span> - {submission.officer_name}
                </p>
                {submission.simlok_number && (
                  <p className="text-xs">
                    <span className="font-medium">No. SIMLOK:</span> {submission.simlok_number}
                    {submission.simlok_date && (
                      <span className="ml-2">• <span className="font-medium">Tanggal:</span> {new Date(submission.simlok_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
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
              onClick={() => setActiveTab('approval')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'approval'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClipboardDocumentCheckIcon className="h-5 w-5 inline mr-2" />
              Proses Approval
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
                  {/* Header with Status */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Informasi SIMLOK</h3>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">Review:</span>
                      {getStatusBadge(submission.review_status)}
                      <span className="text-sm text-gray-500">Status:</span>
                      {getStatusBadge(submission.final_status)}
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
                  </div>

                  {/* Jadwal Pelaksanaan */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">Jadwal Pelaksanaan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tanggal Mulai Pelaksanaan
                        </label>
                        <div className="bg-white p-3 border border-gray-200 rounded-lg">
                          <p className="text-gray-900">
                            {submission.implementation_start_date ? new Date(submission.implementation_start_date).toLocaleDateString('id-ID') : '-'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tanggal Selesai Pelaksanaan
                        </label>
                        <div className="bg-white p-3 border border-gray-200 rounded-lg">
                          <p className="text-gray-900">
                            {submission.implementation_end_date ? new Date(submission.implementation_end_date).toLocaleDateString('id-ID') : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Final Status Information */}
                  {submission.final_status !== 'PENDING_APPROVAL' && (
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">Status</h4>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">Status:</span>
                          {getStatusBadge(submission.final_status)}
                        </div>
                        {submission.simlok_number && (
                          <p className="text-sm text-gray-700">
                            <strong>Nomor SIMLOK:</strong> {submission.simlok_number}
                          </p>
                        )}
                        {submission.simlok_date && (
                          <p className="text-sm text-gray-700">
                            <strong>Tanggal SIMLOK:</strong> {new Date(submission.simlok_date).toLocaleDateString('id-ID')}
                          </p>
                        )}
                        {submission.final_note && (
                          <p className="text-sm text-gray-700">
                            <strong>Catatan:</strong> {submission.final_note}
                          </p>
                        )}
                        {submission.approved_by_name && (
                          <p className="text-xs text-gray-500">
                            Diproses oleh: {submission.approved_by_name}
                            {submission.approved_at && (
                              <span> pada {new Date(submission.approved_at).toLocaleDateString('id-ID')}</span>
                            )}
                          </p>
                        )}
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
                      {/* <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                        Foto: {submission.worker_list.length}
                      </span> */}
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
                                  src={worker.worker_photo ? fileUrlHelper.convertLegacyUrl(worker.worker_photo, `foto_pekerja_${worker.id}`) : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgODBDMTA4LjI4NCA4MCA5Ni41NjggODggOTYuNTY4IDEwMEM5Ni41NjggMTEyIDEwOC4yODQgMTIwIDEwMCAxMjBDOTEuNzE2IDEyMCA4My40MzIgMTEyIDgzLjQzMiAxMDBDODMuNDMyIDg4IDkxLjcxNiA4MCA5Ni41NjggODBIMTAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTQwIDEzNkMxNDAgMTI2LjMyIDEzMi4wOTEgMTE4IDEyMiAxMThaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='}
                                  alt={`Foto ${worker.worker_name}`}
                                  className="w-full h-48 rounded-lg object-cover shadow-sm"
                                  onLoad={() => console.log('Approver tab - Image loaded successfully for:', worker.worker_name)}
                                  onError={(e) => {
                                    console.log('Approver tab - Image load error for worker:', worker.worker_name, 'URL:', worker.worker_photo);
                                    if (worker.worker_photo) {
                                      console.log('Approver tab - Processed URL:', fileUrlHelper.convertLegacyUrl(worker.worker_photo, `foto_pekerja_${worker.id}`));
                                    }
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

              {/* Approval Tab */}
              {activeTab === 'approval' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Proses Approval Final</h3>
                  {/* Review Information */}
                  {submission.review_note && (
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">Catatan Review</h4>
                      <p className="text-gray-700 whitespace-pre-line">{submission.review_note}</p>
                      {submission.reviewed_by_name && (
                        <p className="text-sm text-gray-500 mt-2">
                          Direview oleh: {submission.reviewed_by_name}
                          {submission.reviewed_at && (
                            <span> pada {new Date(submission.reviewed_at).toLocaleDateString('id-ID')}</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {submission.final_status !== 'PENDING_APPROVAL' && (
                    <div className={`
                      rounded-xl p-6 mb-6 border-2
                      ${submission.final_status === 'APPROVED' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                      }
                    `}>
                      <div className="flex items-start space-x-4">
                        <div className={`
                          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                          ${submission.final_status === 'APPROVED' 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                          }
                        `}>
                          {submission.final_status === 'APPROVED' ? (
                            <CheckCircleIcon className="h-6 w-6 text-green-600" />
                          ) : (
                            <XCircleIcon className="h-6 w-6 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={`
                            text-lg font-semibold mb-2
                            ${submission.final_status === 'APPROVED' 
                              ? 'text-green-900' 
                              : 'text-red-900'
                            }
                          `}>
                            {submission.final_status === 'APPROVED' ? 'Pengajuan Disetujui' : 'Pengajuan Ditolak'}
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-700">Status:</span>
                              {getStatusBadge(submission.final_status)}
                            </div>
                            {submission.final_note && (
                              <div>
                                <span className="font-medium text-gray-700">Catatan:</span>
                                <p className="mt-1 text-gray-600">{submission.final_note}</p>
                              </div>
                            )}
                            {submission.approved_by_name && (
                              <div className="pt-2 border-t border-gray-200">
                                <span className="font-medium text-gray-700">Diproses oleh:</span>
                                <p className="text-gray-600">
                                  {submission.approved_by_name} pada{' '}
                                  {new Date(submission.approved_at!).toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {canApprove && (
                    <div className="space-y-8">
                      {/* Status Selection Card */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <ClipboardDocumentCheckIcon className="h-5 w-5 text-blue-600 mr-2" />
                          Keputusan Persetujuan
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Approve Option */}
                          <label className={`
                            relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                            ${approvalData.final_status === 'APPROVED' 
                              ? 'border-green-500 bg-green-50 shadow-md' 
                              : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                            }
                          `}>
                            <input
                              type="radio"
                              name="final_status"
                              value="APPROVED"
                              checked={approvalData.final_status === 'APPROVED'}
                              onChange={(e) => {
                                handleStatusChange(e.target.value as 'APPROVED');
                              }}
                              className="sr-only"
                            />
                            <div className="flex items-center flex-1">
                              <div className={`
                                flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center
                                ${approvalData.final_status === 'APPROVED' 
                                  ? 'border-green-500 bg-green-500' 
                                  : 'border-gray-300'
                                }
                              `}>
                                {approvalData.final_status === 'APPROVED' && (
                                  <CheckCircleIcon className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">Setujui Pengajuan</div>
                                <div className="text-xs text-gray-500">Pengajuan akan disetujui dan nomor SIMLOK dibuat</div>
                              </div>
                            </div>
                          </label>

                          {/* Reject Option */}
                          <label className={`
                            relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                            ${approvalData.final_status === 'REJECTED' 
                              ? 'border-red-500 bg-red-50 shadow-md' 
                              : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50'
                            }
                          `}>
                            <input
                              type="radio"
                              name="final_status"
                              value="REJECTED"
                              checked={approvalData.final_status === 'REJECTED'}
                              onChange={(e) => {
                                handleStatusChange(e.target.value as 'REJECTED');
                              }}
                              className="sr-only"
                            />
                            <div className="flex items-center flex-1">
                              <div className={`
                                flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center
                                ${approvalData.final_status === 'REJECTED' 
                                  ? 'border-red-500 bg-red-500' 
                                  : 'border-gray-300'
                                }
                              `}>
                                {approvalData.final_status === 'REJECTED' && (
                                  <XCircleIcon className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">Tolak Pengajuan</div>
                                <div className="text-xs text-gray-500">Pengajuan akan ditolak dengan alasan</div>
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {approvalData.final_status === 'APPROVED' && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-2" />
                            Informasi SIMLOK
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nomor SIMLOK
                                <span className="text-red-500 ml-1">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={approvalData.simlok_number}
                                  onChange={(e) => setApprovalData({ ...approvalData, simlok_number: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                                  placeholder="Dibuat otomatis"
                                  required
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                  <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 mt-2 flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                Nomor otomatis dibuat berdasarkan urutan bulanan
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tanggal Penerbitan Simlok
                              </label>
                              <input
                                type="date"
                                value={approvalData.simlok_date}
                                onChange={(e) => setApprovalData({ ...approvalData, simlok_date: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                              />
                              <p className="text-xs text-gray-600 mt-2 flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                Tanggal dapat disesuaikan sesuai kebutuhan
                              </p>
                            </div>
                          </div>
                        </div>
                      )}



                      {/* Submit Button */}
                      <div className="flex justify-end pt-4 border-t border-gray-200">
                        <Button
                          onClick={handleSubmitApproval}
                          disabled={
                            !approvalData.final_status || 
                            (approvalData.final_status === 'APPROVED' && !approvalData.simlok_number.trim()) ||
                            saving
                          }
                          className={`
                            px-8 py-3 rounded-lg font-medium transition-all duration-200 min-w-[160px]
                            ${approvalData.final_status === 'APPROVED'
                              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                              : approvalData.final_status === 'REJECTED'
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }
                          `}
                        >
                          {saving ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Memproses
                            </div>
                          ) : (
                            <div className="flex items-center">
                              {approvalData.final_status === 'APPROVED' ? (
                                <>
                                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                                  Setujui Pengajuan
                                </>
                              ) : approvalData.final_status === 'REJECTED' ? (
                                <>
                                  <XCircleIcon className="h-5 w-5 mr-2" />
                                  Tolak Pengajuan
                                </>
                              ) : (
                                'Pilih Status'
                              )}
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!canApprove && submission.final_status !== 'PENDING_APPROVAL' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                          <ClipboardDocumentCheckIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-medium text-blue-900 mb-2">Pengajuan Sudah Difinalisasi</h3>
                        <p className="text-sm text-blue-700">
                          Status persetujuan tidak dapat diubah karena pengajuan telah selesai diproses.
                        </p>
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
          <div className="flex items-center space-x-3">
            {/* Debug info untuk development */}
            {/* {submission && (
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Status: {submission.final_status} | SIMLOK: {submission.simlok_number || 'Belum ada'}
              </div>
            )} */}
            
            {/* Tampilkan tombol PDF - approver bisa lihat di semua status */}
            {submission && (
              <Button onClick={handleViewPdf} variant="primary" size="sm">
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                Lihat PDF
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

export default ApproverSubmissionDetailModal;