/**
 * QR Scan related types
 */

/**
 * Scan result from API response
 */
export interface ScanResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  scanned_at?: string;
  scanned_by?: string;
  scan_id?: string;
  previousScan?: {
    scanDate: string | Date;
    scanId: string;
    scannerName: string;
  };
}

/**
 * QrScan type for scan history tables
 */
export interface QrScan {
  id: string;
  submission_id: string;
  scanned_by: string;
  scanned_at: string; // ISO
  scanner_name?: string;
  scan_location?: string;
  notes?: string;
  submission: {
    id: string;
    simlok_number: string;
    vendor_name: string;
    job_description: string;
    review_status: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS' | string;
    approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | string;
  };
  user: {
    id: string;
    officer_name: string;
    email: string;
    role: string;
  };
}

/**
 * ScanData type for detailed scan modal
 */
export interface ScanData {
  id: string;
  submission_id: string;
  scanned_by: string;
  scanned_at: string;
  scanner_name: string;
  scan_location?: string;
  notes?: string;
  submission: {
    id: string;
    simlok_number: string | null;
    vendor_name: string;
    based_on: string;
    officer_name: string;
    job_description: string;
    work_location: string;
    implementation: string | null;
    working_hours: string;
    work_facilities: string;
    worker_names: string;
    content: string;
    approval_status: string;
    approved_at: string | null;
    review_status?: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
    // Worker information
    worker_count?: number;
    // Implementation dates
    implementation_start_date?: string;
    implementation_end_date?: string;
    created_at?: string;
    // Documents
    simja_number?: string;
    simja_date?: string;
    simja_type?: string;
    sika_number?: string;
    sika_date?: string;
    sika_type?: string;
    hsse_pass_number?: string;
    hsse_pass_valid_thru?: string;
    // Working hours
    holiday_working_hours?: string;
    vendor_phone?: string | null;
    // User info (denormalized)
    user_email?: string | null;
    user_officer_name?: string | null;
    user_vendor_name?: string | null;
    user_phone_number?: string | null;
    user_address?: string | null;
    vendor_email?: string | null;
    vendor_address?: string | null;
  };
}

