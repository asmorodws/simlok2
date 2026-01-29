'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, DocumentTextIcon, UserGroupIcon, ClipboardDocumentCheckIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import TabNavigation, { type TabItem } from './TabNavigation';
import { SubmissionStatusCards } from './StatusCards';
import SimlokPdfModal from '@/components/features/document/SimlokPdfModal';
import DocumentPreviewModal from '@/components/features/document/DocumentPreviewModal';
import DetailsTab from './detail/DetailsTab';
import WorkersTab from './detail/WorkersTab';
import ScanHistoryTab from './detail/ScanHistoryTab';
import ReviewerActions from './detail/actions/ReviewerActions';
import ApproverActions from './detail/actions/ApproverActions';
import { useSubmissionDetail } from './hooks/useSubmissionDetail';
import { ReviewStatusBadge, ApprovalStatusBadge } from './SubmissionDetailShared';
import { fileUrlHelper } from '@/lib/file/fileUrlHelper';

type UserRole = 'VENDOR' | 'REVIEWER' | 'APPROVER' | 'VERIFIER' | 'SUPER_ADMIN';

interface UnifiedSubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  userRole: UserRole;
  onSuccess?: () => void;
}

export default function UnifiedSubmissionDetailModal({
  isOpen,
  onClose,
  submissionId,
  userRole,
  onSuccess,
}: UnifiedSubmissionDetailModalProps) {
  const { submission, loading, scanHistory, loadingScanHistory, refetch } = useSubmissionDetail({
    submissionId,
    isOpen,
    onClose,
  });

  const [activeTab, setActiveTab] = useState<string>('details');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    fileUrl: string;
    fileName: string;
  }>({
    isOpen: false,
    fileUrl: '',
    fileName: '',
  });

  // Determine available tabs based on role
  const tabs: TabItem[] = [
    { key: 'details', label: 'Detail SIMLOK', shortLabel: 'Detail', icon: DocumentTextIcon },
    { key: 'workers', label: 'Data Pekerja', shortLabel: 'Pekerja', icon: UserGroupIcon },
  ];

  // Add action tabs based on role and status
  if (userRole === 'REVIEWER' && submission?.review_status === 'PENDING_REVIEW') {
    tabs.push({ key: 'review', label: 'Proses Review', shortLabel: 'Review', icon: ClipboardDocumentCheckIcon });
  }

  if (userRole === 'APPROVER' && submission?.approval_status === 'PENDING_APPROVAL') {
    tabs.push({ key: 'approval', label: 'Proses Approval', shortLabel: 'Approval', icon: ClipboardDocumentCheckIcon });
  }

  // Add scan history tab for approver
  if (userRole === 'APPROVER') {
    tabs.push({ key: 'scans', label: 'Riwayat Scan', shortLabel: 'Scan', icon: QrCodeIcon });
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset active tab when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('details');
    }
  }, [isOpen]);

  const handleViewPdf = () => {
    setIsPdfModalOpen(true);
  };

  const handleViewDocument = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      const convertedUrl = fileUrlHelper.convertLegacyUrl(fileUrl, fileName);
      setPreviewModal({
        isOpen: true,
        fileUrl: convertedUrl,
        fileName,
      });
    }
  };

  const handleClosePreview = () => {
    setPreviewModal({
      isOpen: false,
      fileUrl: '',
      fileName: '',
    });
  };

  const handleActionSuccess = () => {
    refetch();
    if (onSuccess) {
      onSuccess();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
        <div className="bg-white rounded-none sm:rounded-xl shadow-xl w-full h-full sm:max-w-6xl sm:w-full sm:max-h-[90vh] sm:h-auto flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                {userRole === 'REVIEWER' ? 'Detail & Review Pengajuan' : 
                 userRole === 'APPROVER' ? 'Detail & Approval Pengajuan' : 
                 'Detail Pengajuan'}
              </h2>
              {submission && (
                <div className="text-sm text-gray-500 mt-1">
                  <p>
                    <span className="font-medium">{submission.vendor_name}</span> - {submission.officer_name}
                  </p>
                  {submission.simlok_number && (
                    <p className="text-xs mt-1">
                      <span className="font-medium">No. SIMLOK:</span> {submission.simlok_number}
                      {submission.simlok_date && (
                        <span className="ml-2">
                          • <span className="font-medium">Tanggal:</span>{' '}
                          {new Date(submission.simlok_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </p>
                  )}
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
            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
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
                    {/* Status Cards */}
                    <SubmissionStatusCards
                      createdAt={submission.created_at}
                      reviewStatusBadge={<ReviewStatusBadge status={submission.review_status} />}
                      approvalStatusBadge={<ApprovalStatusBadge status={submission.approval_status} />}
                    />

                    <DetailsTab
                      submission={submission}
                      onViewPdf={handleViewPdf}
                      onViewDocument={handleViewDocument}
                    />
                  </div>
                )}

                {/* Workers Tab */}
                {activeTab === 'workers' && (
                  <WorkersTab submission={submission} />
                )}

                {/* Review Tab (Reviewer only) */}
                {activeTab === 'review' && userRole === 'REVIEWER' && (
                  <ReviewerActions submission={submission} onSuccess={handleActionSuccess} />
                )}

                {/* Approval Tab (Approver only) */}
                {activeTab === 'approval' && userRole === 'APPROVER' && (
                  <ApproverActions submission={submission} onSuccess={handleActionSuccess} />
                )}

                {/* Scan History Tab (Approver only) */}
                {activeTab === 'scans' && userRole === 'APPROVER' && (
                  <ScanHistoryTab scanHistory={scanHistory} loading={loadingScanHistory} />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* PDF Modal */}
      {submission && (
        <SimlokPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          submissionId={submission.id}
          submissionName={submission.submission_name}
          {...(submission.nomor_simlok && { nomorSimlok: submission.nomor_simlok })}
        />
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={handleClosePreview}
        fileUrl={previewModal.fileUrl}
        fileName={previewModal.fileName}
      />
    </>
  );
}
