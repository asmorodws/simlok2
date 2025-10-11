'use client';

import React from 'react';
import ScanDetailModal from '@/components/common/ScanDetailModal';
import type { QrScan } from '@/components/scanner/ScanHistoryTable';

// Import ScanData type from ScanDetailModal
interface ScanData {
  id: string;
  submission_id: string;
  scanned_by: string;
  scanned_at: string;
  scanner_name: string;
  scan_location?: string;
  notes?: string;
  submission: {
    id: string;
    simlok_number?: string;
    vendor_name: string;
    officer_name: string;
    job_description: string;
    work_location: string;
    approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    working_hours?: string;
    implementation?: string;
    simja_number?: string;
    sika_number?: string;
    worker_count?: number;
    implementation_start_date?: string;
    implementation_end_date?: string;
    created_at?: string;
    review_status?: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  scan: QrScan | null;
  onOpenPdf?: (scan: QrScan) => void; // opsional: buka PDF SIMLOK dari approver
}

// Adapter function to convert QrScan to ScanData format
const convertQrScanToScanData = (qrScan: QrScan): ScanData => {
  const baseSubmission = {
    id: qrScan.submission.id,
    simlok_number: qrScan.submission.simlok_number,
    vendor_name: qrScan.submission.vendor_name,
    officer_name: qrScan.user.officer_name, // Map from user
    job_description: qrScan.submission.job_description,
    work_location: qrScan.scan_location || '', // Use scan location as fallback
    approval_status: qrScan.submission.approval_status as 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED',
    working_hours: '',
    implementation: '',
    simja_number: '',
    sika_number: '',
    implementation_start_date: '',
    implementation_end_date: '',
    created_at: '',
    review_status: qrScan.submission.review_status as 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS'
  };

  const result: ScanData = {
    id: qrScan.id,
    submission_id: qrScan.submission_id,
    scanned_by: qrScan.scanned_by,
    scanned_at: qrScan.scanned_at,
    scanner_name: qrScan.user.officer_name, // Map from user.officer_name
    submission: baseSubmission
  };

  // Only add optional properties if they exist
  if (qrScan.scan_location) {
    result.scan_location = qrScan.scan_location;
  }
  if (qrScan.notes) {
    result.notes = qrScan.notes;
  }

  return result;
};

export default function ApproverScanDetailModal({ open, onClose, scan, onOpenPdf }: Props) {
  const convertedScan = scan ? convertQrScanToScanData(scan) : null;

  const modalProps: any = {
    isOpen: open,
    onClose: onClose,
    scan: convertedScan,
    showPdfButton: !!onOpenPdf,
    title: "Detail Scan QR Code",
    subtitle: "Informasi scan dari perspektif approver"
  };

  if (onOpenPdf && scan) {
    modalProps.onViewPdf = (_: ScanData) => onOpenPdf(scan);
  }

  return <ScanDetailModal {...modalProps} />;
}
