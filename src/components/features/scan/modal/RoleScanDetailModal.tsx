'use client';

import React from 'react';
import ScanDetailModal from '@/components/features/scan/modal/ScanDetailModal';
import type { QrScan, ScanData } from '@/types';

type UserRole = 'APPROVER' | 'REVIEWER' | 'VERIFIER' | 'VENDOR' | 'VISITOR';

interface Props {
  open: boolean;
  onClose: () => void;
  scan: QrScan | null;
  role: UserRole;
  onOpenPdf?: (scan: QrScan) => void;
}

// Role-specific subtitles
const ROLE_SUBTITLES: Record<UserRole, string> = {
  APPROVER: 'Informasi scan dari perspektif approver',
  REVIEWER: 'Informasi scan dari perspektif reviewer',
  VERIFIER: 'Informasi scan dari perspektif verifier',
  VENDOR: 'Informasi scan dari perspektif vendor',
  VISITOR: 'Informasi scan untuk visitor',
};

// Adapter function to convert QrScan to ScanData format
const convertQrScanToScanData = (qrScan: QrScan): ScanData => {
  const baseSubmission = {
    id: qrScan.submission.id,
    simlok_number: qrScan.submission.simlok_number,
    vendor_name: qrScan.submission.vendor_name,
    officer_name: qrScan.user.officer_name, // Map from user
    job_description: qrScan.submission.job_description,
    work_location: (qrScan.submission as any).work_location || qrScan.scan_location || '', // Use submission work_location or scan location as fallback
    approval_status: qrScan.submission.approval_status,
    // Required fields
    based_on: (qrScan.submission as any).based_on || '',
    implementation: (qrScan.submission as any).implementation || null,
    working_hours: (qrScan.submission as any).working_hours || '',
    work_facilities: (qrScan.submission as any).work_facilities || '',
    worker_names: (qrScan.submission as any).worker_names || '',
    content: (qrScan.submission as any).content || '',
    approved_at: (qrScan.submission as any).approved_at || null,
    // Optional fields
    worker_count: (qrScan.submission as any).worker_count,
    implementation_start_date: (qrScan.submission as any).implementation_start_date,
    implementation_end_date: (qrScan.submission as any).implementation_end_date,
    created_at: (qrScan.submission as any).created_at,
    review_status: qrScan.submission.review_status as 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS',
    // Vendor contact information
    vendor_email: (qrScan.submission as any).user_email,
    vendor_phone: (qrScan.submission as any).user_phone_number || (qrScan.submission as any).vendor_phone,
    vendor_address: (qrScan.submission as any).user_address,
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

export default function RoleScanDetailModal({ open, onClose, scan, role, onOpenPdf }: Props) {
  const convertedScan = scan ? convertQrScanToScanData(scan) : null;

  const modalProps: any = {
    isOpen: open,
    onClose: onClose,
    scan: convertedScan,
    showPdfButton: !!onOpenPdf,
    title: "Detail Scan QR Code",
    subtitle: ROLE_SUBTITLES[role] || 'Informasi scan QR Code'
  };

  if (onOpenPdf && scan) {
    modalProps.onViewPdf = (_: ScanData) => onOpenPdf(scan);
  }

  return <ScanDetailModal {...modalProps} />;
}
