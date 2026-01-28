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
  ClockIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  DocumentIcon,
  EyeIcon,
  MapPinIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { useToast } from '@/hooks/useToast';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';
import { fileUrlHelper } from '@/lib/file/fileUrlHelper';
import SimlokPdfModal from '@/components/features/document/modal/SimlokPdfModal';
import DetailSection from '@/components/shared/card/DetailSection';
import InfoCard from '@/components/shared/card/InfoCard';
import DocumentPreviewModal from '@/components/features/document/modal/DocumentPreviewModal';
import NoteCard from '@/components/ui/card/NoteCard';
import SupportDocumentsSection from '@/components/features/document/section/SupportDocumentsSection';
import TabNavigation, { type TabItem } from '@/components/features/submission/card/TabNavigation';
import { SubmissionStatusCards } from '@/components/features/submission/card/StatusCards';

import DatePicker from '@/components/form/DatePicker';
import { useServerTime } from '@/hooks/useServerTime';
import {
  type BaseSubmissionDetail,
  formatDate,
  formatWorkLocation,
  generateSimlokNumber,
} from '@/components/features/submission/shared/SubmissionDetailShared';

// Using BaseSubmissionDetail from shared utilities
import type { QrScan } from '@/types';

type SubmissionDetail = BaseSubmissionDetail;

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
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({
    isOpen: false,
    fileUrl: '',
    fileName: ''
  });
  const { showSuccess, showError } = useToast();
  const { eventSource, isConnected } = useRealTimeNotifications();
  const { getCurrentDate, isLoaded: serverTimeLoaded } = useServerTime();

  // Tab configuration
  const tabs: TabItem[] = [
    {
      key: 'details',
      label: 'Detail SIMLOK',
      shortLabel: 'Detail',
      icon: DocumentTextIcon,
    },
    {
      key: 'workers',
      label: 'Data Pekerja',
      shortLabel: 'Pekerja',
      icon: UserGroupIcon,
    },
    {
      key: 'approval',
      label: 'Proses Approval',
      shortLabel: 'Approval',
      icon: ClipboardDocumentCheckIcon,
    },
  ];

  // Use shared formatDate and formatWorkLocation from SubmissionDetailShared
  // (removed local duplicate functions)

  // Handle file view
  const handleFileView = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      // Convert legacy URL to new format if needed
      const convertedUrl = fileUrlHelper.convertLegacyUrl(fileUrl, fileName);
      setPreviewModal({
        isOpen: true,
        fileUrl: convertedUrl,
        fileName
      });
    }
  };

  // Handle close preview
  const handleClosePreview = () => {
    setPreviewModal({
      isOpen: false,
      fileUrl: '',
      fileName: ''
    });
  };

  // Approval form state
  const [approvalData, setApprovalData] = useState({
    approval_status: '' as 'APPROVED' | 'REJECTED' | '',
    simlok_number: '',
    simlok_date: '',
    note_for_vendor: ''
  });

  const fetchSubmissionDetail = async () => {
    if (!submissionId) return;
    
    try {
      setLoading(true);
      
  const response = await fetch(`/api/submissions/${submissionId}`, { cache: 'no-store' });
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
        throw new Error('Gagal mengambil detail pengajuan');
      }
      
      const data = await response.json();
      
      if (!data.submission) {
        throw new Error('Data submission tidak ditemukan dalam response');
      }
      
      setSubmission(data.submission);
      
      // Initialize approval data with Jakarta timezone for date parsing
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
        approval_status: data.submission.approval_status === 'PENDING_APPROVAL' ? '' : data.submission.approval_status,
        simlok_number: data.submission.simlok_number || '',
        // Jika sudah ada simlok_date, gunakan itu. Jika belum DAN server time sudah loaded, gunakan server date
        simlok_date: parseSimlokDate(data.submission.simlok_date) || (serverTimeLoaded ? getCurrentDate() : ''),
        note_for_vendor: data.submission.note_for_vendor || ''
      });
      
      // Auto-fill SIMLOK number jika status APPROVED dan belum ada nomor SIMLOK
      if (data.submission.approval_status === 'APPROVED' && !data.submission.simlok_number) {
        const simlokNumber = await generateSimlokNumber();
        setApprovalData(prev => ({
          ...prev,
          simlok_number: simlokNumber
          // simlok_date sudah di-set di atas dengan getCurrentDate() sebagai default
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
  const response = await fetch(`/api/submissions/${submissionId}/scans`, { cache: 'no-store' });
      
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

  // Update simlok_date with server time once it's loaded (untuk initial state)
  useEffect(() => {
    if (serverTimeLoaded && approvalData.simlok_date === '' && submission?.approval_status === 'PENDING_APPROVAL') {
      setApprovalData(prev => ({
        ...prev,
        simlok_date: getCurrentDate()
      }));
    }
  }, [serverTimeLoaded, getCurrentDate]);

  // Listen to SSE notifications and refetch submission detail when related notifications arrive
  useEffect(() => {
    if (!eventSource || !submissionId) return;

    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        // message.data may be a notification payload; the nested `data` field might be a JSON string
        const payload = message.data || {};

        // Try to extract submissionId from payload.data (which can be stringified JSON) or payload directly
        let inner = payload.data ?? payload;
        if (typeof inner === 'string') {
          try {
            inner = JSON.parse(inner);
          } catch (err) {
            // ignore parse error
          }
        }

        const notifiedSubmissionId = inner?.submissionId || inner?.submission_id || payload?.submissionId || payload?.submission_id;
        if (notifiedSubmissionId && String(notifiedSubmissionId) === String(submissionId)) {
          // refetch detail to show latest status
          fetchSubmissionDetail();
        }
      } catch (err) {
        // ignore malformed messages
      }
    };

    eventSource.addEventListener('message', handler as EventListener);

    return () => {
      try { eventSource.removeEventListener('message', handler as EventListener); } catch (e) { /* ignore */ }
    };
  }, [eventSource, submissionId]);

  // Fallback polling when SSE is not available: poll submission detail every 5s while modal is open
  useEffect(() => {
    if (isConnected) return; // SSE available, no polling needed
    if (!isOpen || !submissionId) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        await fetchSubmissionDetail();
      } catch (e) {
        // ignore polling errors
      }
    };

    // Initial immediate fetch to reduce perceived latency
    tick();

    const intervalId = window.setInterval(tick, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isConnected, isOpen, submissionId]);

  const handleViewPdf = () => {
    setIsPdfModalOpen(true);
  };

  const handleSubmitApproval = async () => {
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

      const response = await fetch(`/api/submissions/${submissionId}/approve`, {
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
          onClose();
          // Add delay before refreshing so user can see the error message
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengirim persetujuan');
      }

      const data = await response.json();
      setSubmission(data.submission);
      showSuccess('Berhasil', `Pengajuan berhasil ${approvalData.approval_status === 'APPROVED' ? 'disetujui' : 'ditolak'}`);
      onApprovalSubmitted();
      
    } catch (err: any) {
      console.error('Error submitting approval:', err);
      showError('Error', err.message || 'Gagal menyimpan persetujuan');
    } finally {
      setSaving(false);
    }
  };

  const canApprove = submission && submission.approval_status === 'PENDING_APPROVAL';

  // Handle status change with auto-fill
  const handleStatusChange = async (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'APPROVED') {
      // Auto-fill nomor SIMLOK dan tanggal jika belum ada
      const simlokNumber = await generateSimlokNumber();
      setApprovalData(prev => ({
        ...prev,
        approval_status: status,
        simlok_number: prev.simlok_number || simlokNumber,
        // Hanya set tanggal jika server time sudah loaded
        simlok_date: prev.simlok_date || (serverTimeLoaded ? getCurrentDate() : '')
      }));
    } else {
      // Reset SIMLOK fields jika status REJECTED
      setApprovalData(prev => ({
        ...prev,
        approval_status: status,
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-xl shadow-xl w-full h-full sm:max-w-6xl sm:w-full sm:max-h-[90vh] sm:h-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Detail & Approval Pengajuan</h2>
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
                        <div className="space-y-1">
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
                          {scanHistory.lastScan.scan_location && (
                            <div className="flex items-center text-xs text-gray-500">
                              <MapPinIcon className="h-3 w-3 mr-1" />
                              <span>Lokasi: {scanHistory.lastScan.scan_location}</span>
                            </div>
                          )}
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
        <div className="border-b border-gray-200 flex-shrink-0 px-4 sm:px-6">
          <TabNavigation 
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(key) => setActiveTab(key as 'details' | 'workers' | 'approval')}
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
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Header dengan Status */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Detail SIMLOK</h3>
                    </div>
                    
                    {/* Status Cards */}
                    <SubmissionStatusCards
                      createdAt={submission.created_at}
                      reviewStatusBadge={getStatusBadge(submission.review_status)}
                      approvalStatusBadge={getStatusBadge(submission.approval_status)}
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
                        className="md:col-span-2"
                      /> */}
                    </div>
                  </DetailSection>

                  {/* Informasi Dokumen SIMJA/SIKA/HSSE - tetap tampilkan data legacy */}


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
                      <div className={`grid grid-cols-1 gap-4 ${
                        submission.hsse_pass_document_upload 
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
                          submission.implementation_start_date && submission.implementation_end_date
                            ? `${formatDate(submission.implementation_start_date)} s/d ${formatDate(submission.implementation_end_date)}`
                            : submission.implementation || '-'
                        }
                      />
                      <InfoCard
                        label="Jam Kerja"
                        value={
                          <div className="space-y-0.5 text-sm font-normal text-gray-900">
                            <div>{submission.working_hours} (Hari kerja)</div>
                            {submission.holiday_working_hours && (
                              <div>{submission.holiday_working_hours} (Hari libur)</div>
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

                  {/* Dokumen Pendukung */}
                  {/* <DetailSection title="Dokumen Pendukung" icon={<DocumentTextIcon className="h-5 w-5 text-blue-600" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InfoCard
                        label="Nomor SIMJA"
                        value={submission.simja_number || '-'}
                      />
                      <InfoCard
                        label="Tanggal SIMJA"
                        value={submission.simja_date ? formatDate(submission.simja_date) : '-'}
                      />
                      <InfoCard
                        label="Nomor SIKA"
                        value={submission.sika_number || '-'}
                      />
                      <InfoCard
                        label="Tanggal SIKA"
                        value={submission.sika_date ? formatDate(submission.sika_date) : '-'}
                      />
                    </div>
                  </DetailSection> */}

                  {/* Dokumen Upload */}
                  

                  {/* Final Status Information */}
                  {submission.approval_status !== 'PENDING_APPROVAL' && (
                    <DetailSection title="Status Pengajuan" icon={<CheckCircleIcon className="h-5 w-5 text-blue-600" />}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoCard
                          label="Status"
                          value={getStatusBadge(submission.approval_status)}
                        />
                        {submission.simlok_number && (
                          <InfoCard
                            label="Nomor SIMLOK"
                            value={submission.simlok_number}
                          />
                        )}
                        {submission.simlok_date && (
                          <InfoCard
                            label="Tanggal SIMLOK"
                            value={formatDate(submission.simlok_date)}
                          />
                        )}
                        {submission.note_for_vendor && (
                          <div className="md:col-span-2">
                            <NoteCard title="Catatan untuk Vendor" note={submission.note_for_vendor} />
                          </div>
                        )}
                        {submission.approved_by && (
                          <InfoCard
                            label="Diproses oleh"
                            value={`${submission.approved_by}${submission.approved_at ? ` pada ${formatDate(submission.approved_at)}` : ''}`}
                            className="md:col-span-2"
                          />
                        )}
                      </div>
                    </DetailSection>
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
                      <Badge variant="info">
                        Total: {submission.worker_count || 
                          (submission.worker_names ? submission.worker_names.split('\n').filter(name => name.trim()).length : submission.worker_list.length)
                        } pekerja
                      </Badge>
                      {/* <Badge variant="success">
                        Foto: {submission.worker_list.length}
                      </Badge> */}
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

              {/* Approval Tab */}
              {activeTab === 'approval' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Proses Approval Final</h3>
                  {/* Review Information */}
                  {submission.note_for_approver && (
                    <div className="md:col-span-1">
                      <NoteCard title="Catatan Review" note={submission.note_for_approver} />
                      {submission.reviewed_by && (
                        <p className="text-sm text-gray-500 mt-2">
                          Direview oleh: {submission.reviewed_by}
                          {submission.reviewed_at && (
                            <span> pada {new Date(submission.reviewed_at).toLocaleDateString('id-ID')}</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {submission.approval_status !== 'PENDING_APPROVAL' && (
                    <div className={`
                      rounded-xl p-6 mb-6 border-2
                      ${submission.approval_status === 'APPROVED' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                      }
                    `}>
                      <div className="flex items-start space-x-4">
                        <div className={`
                          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                          ${submission.approval_status === 'APPROVED' 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                          }
                        `}>
                          {submission.approval_status === 'APPROVED' ? (
                            <CheckCircleIcon className="h-6 w-6 text-green-600" />
                          ) : (
                            <XCircleIcon className="h-6 w-6 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={`
                            text-lg font-semibold mb-2
                            ${submission.approval_status === 'APPROVED' 
                              ? 'text-green-900' 
                              : 'text-red-900'
                            }
                          `}>
                            {submission.approval_status === 'APPROVED' ? 'Pengajuan Disetujui' : 'Pengajuan Ditolak'}
                          </h4>
                          <div className="space-y-2 text-sm">
                            {/* <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-700">Status:</span>
                              {getStatusBadge(submission.approval_status)}
                            </div> */}
                           
                            {submission.approved_by && (
                              <div className="pt-2 border-t border-gray-200">
                                <span className="font-medium text-gray-700">Diproses oleh:</span>
                                <p className="text-gray-600">
                                  {submission.approved_by} pada{' '}
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
                            ${approvalData.approval_status === 'APPROVED' 
                              ? 'border-green-500 bg-green-50 shadow-md' 
                              : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                            }
                          `}>
                            <input
                              type="radio"
                              name="approval_status"
                              value="APPROVED"
                              checked={approvalData.approval_status === 'APPROVED'}
                              onChange={(e) => {
                                handleStatusChange(e.target.value as 'APPROVED');
                              }}
                              className="sr-only"
                            />
                            <div className="flex items-center flex-1">
                              <div className={`
                                flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center
                                ${approvalData.approval_status === 'APPROVED' 
                                  ? 'border-green-500 bg-green-500' 
                                  : 'border-gray-300'
                                }
                              `}>
                                {approvalData.approval_status === 'APPROVED' && (
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
                            ${approvalData.approval_status === 'REJECTED' 
                              ? 'border-red-500 bg-red-50 shadow-md' 
                              : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50'
                            }
                          `}>
                            <input
                              type="radio"
                              name="approval_status"
                              value="REJECTED"
                              checked={approvalData.approval_status === 'REJECTED'}
                              onChange={(e) => {
                                handleStatusChange(e.target.value as 'REJECTED');
                              }}
                              className="sr-only"
                            />
                            <div className="flex items-center flex-1">
                              <div className={`
                                flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center
                                ${approvalData.approval_status === 'REJECTED' 
                                  ? 'border-red-500 bg-red-500' 
                                  : 'border-gray-300'
                                }
                              `}>
                                {approvalData.approval_status === 'REJECTED' && (
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

                      {approvalData.approval_status === 'APPROVED' && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-2" />
                            Informasi SIMLOK
                          </h3>
                          <div className="grid grid-cols-1 gap-6">

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tanggal Penerbitan Simlok
                              </label>
                              <DatePicker
                                value={approvalData.simlok_date}
                                onChange={(value) => setApprovalData({ ...approvalData, simlok_date: value })}
                                placeholder="Pilih tanggal penerbitan SIMLOK"
                                className="w-full px-4 py-3 bg-white shadow-sm"
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
                            !approvalData.approval_status || 
                            (approvalData.approval_status === 'APPROVED' && !approvalData.simlok_number.trim()) ||
                            saving
                          }
                          className={`
                            px-8 py-3 rounded-lg font-medium transition-all duration-200 min-w-[160px]
                            ${approvalData.approval_status === 'APPROVED'
                              ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                              : approvalData.approval_status === 'REJECTED'
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
                              {approvalData.approval_status === 'APPROVED' ? (
                                <>
                                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                                  Setujui Pengajuan
                                </>
                              ) : approvalData.approval_status === 'REJECTED' ? (
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

                  {!canApprove && submission.approval_status !== 'PENDING_APPROVAL' && (
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
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <div className="flex items-center space-x-3">
            {/* Tampilkan tombol PDF - approver bisa lihat di semua status */}
            {submission && (
              <Button onClick={handleViewPdf} variant="primary" size="sm" className="text-xs sm:text-sm">
                <DocumentTextIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">
                  {submission.approval_status === 'APPROVED' ? 'Lihat PDF' : 'Lihat Preview PDF'}
                </span>
                <span className="sm:hidden">
                  {submission.approval_status === 'APPROVED' ? 'PDF' : 'Preview PDF'}
                </span>
              </Button>
            )}
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
    </div>
  );
};

export default ApproverSubmissionDetailModal;