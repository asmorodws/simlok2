/**
 * QR Scan Utilities
 * 
 * Helper functions for QR scan data transformation
 */

import type { QrScan, ScanData } from '@/types';

/**
 * Convert QrScan type (from API) to ScanData type (for UI components)
 */
export function convertQrScanToScanData(qrScan: QrScan): ScanData {
  const baseSubmission = {
    id: qrScan.submission.id,
    simlok_number: qrScan.submission.simlok_number,
    vendor_name: qrScan.submission.vendor_name,
    officer_name: qrScan.user.officer_name,
    job_description: qrScan.submission.job_description,
    work_location: (qrScan.submission as any).work_location || qrScan.scan_location || '',
    approval_status: qrScan.submission.approval_status,
    based_on: (qrScan.submission as any).based_on || '',
    implementation: (qrScan.submission as any).implementation || null,
    working_hours: (qrScan.submission as any).working_hours || '',
    work_facilities: (qrScan.submission as any).work_facilities || '',
    worker_names: (qrScan.submission as any).worker_names || '',
    content: (qrScan.submission as any).content || '',
    approved_at: (qrScan.submission as any).approved_at || null,
    worker_count: (qrScan.submission as any).worker_count,
    implementation_start_date: (qrScan.submission as any).implementation_start_date,
    implementation_end_date: (qrScan.submission as any).implementation_end_date,
    created_at: (qrScan.submission as any).created_at,
    review_status: qrScan.submission.review_status as 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS',
    vendor_email: (qrScan.submission as any).user_email,
    vendor_phone: (qrScan.submission as any).user_phone_number || (qrScan.submission as any).vendor_phone,
    vendor_address: (qrScan.submission as any).user_address,
  };

  const result: ScanData = {
    id: qrScan.id,
    submission_id: qrScan.submission_id,
    scanned_by: qrScan.scanned_by,
    scanned_at: qrScan.scanned_at,
    scanner_name: qrScan.user.officer_name,
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
}

/**
 * Get role-specific subtitle for scan detail modal
 */
export function getScanDetailSubtitle(role: string): string {
  const subtitles: Record<string, string> = {
    APPROVER: 'Informasi scan dari perspektif approver',
    REVIEWER: 'Informasi scan dari perspektif reviewer',
    VERIFIER: 'Informasi scan dari perspektif verifier',
    VENDOR: 'Informasi scan dari perspektif vendor',
    VISITOR: 'Informasi scan untuk visitor',
  };
  
  return subtitles[role] || 'Informasi scan QR Code';
}
