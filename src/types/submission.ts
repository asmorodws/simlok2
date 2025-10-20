/**
 * Submission related types and interfaces
 */

import { ReviewStatus } from '@prisma/client';

// Support Document Interface
export interface SupportDocument {
  id: string;
  document_subtype?: string; // Subtype untuk SIMJA/SIKA (e.g., "Pekerjaan Panas", "Ast. Man. Production")
  document_number?: string;
  document_date?: string;
  document_type: 'SIMJA' | 'SIKA' | 'HSSE';
  document_upload: string;
}

export interface SubmissionData {
  vendor_name: string;
  vendor_phone?: string;
  based_on: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation?: string; // akan diisi oleh admin saat approve
  working_hours: string;
  work_facilities: string;
  worker_count?: number; // jumlah pekerja
  
  // Legacy fields - akan dihapus
  simja_number?: string;
  simja_date?: string;
  sika_number?: string;
  sika_date?: string;
  simja_type?: string;
  sika_type?: string;
  hsse_pass_number?: string;
  hsse_pass_valid_thru?: Date | null;
  hsse_pass_document_upload?: string;
  sika_document_upload?: string;
  simja_document_upload?: string;

  worker_names: string;
  content?: string; // akan diisi oleh admin saat approve
}

export interface SubmissionApprovalData {
  approval_status: 'APPROVED' | 'REJECTED';
  simlok_number?: string;
  simlok_date?: string;
  implementation_start_date?: string;
  implementation_end_date?: string;
}

export interface SubmissionReviewData {
  review_status: ReviewStatus;
  note_for_approver?: string;
  note_for_vendor?: string;
}

export interface WorkerList {
  id: string;
  worker_name: string;
  worker_photo?: string | null;
  hsse_pass_number?: string | null;
  hsse_pass_valid_thru?: Date | null;
  hsse_pass_document_upload?: string | null;
  submission_id: string;
  created_at: Date;
}

// Support Document for submissions
export interface SubmissionSupportDocument {
  id: string;
  document_subtype?: string | null; // Subtype untuk SIMJA/SIKA
  document_type: string;
  document_number?: string | null;
  document_date?: Date | null;
  document_upload: string;
  uploaded_at: Date;
  uploaded_by: string;
}

// Complete submission interface for frontend
export interface Submission {
  id: string;
  job_description: string;
  work_location: string;
  approval_status: string;
  review_status?: string;
  note_for_approver?: string | null;
  note_for_vendor?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  simlok_number?: string | null;
  simlok_date?: string | null;
  created_at: string;
  vendor_name: string;
  officer_name: string;
  based_on: string;
  working_hours: string;
  implementation?: string | null;
  work_facilities: string;
  worker_names: string;
  worker_count?: number | null;
  content?: string | null;
  simja_number?: string | null;
  simja_date?: string | null;
  simja_type?: string | null;
  sika_number?: string | null;
  sika_date?: string | null;
  sika_type?: string | null;
  // HSSE Pass
  hsse_pass_number?: string | null;
  hsse_pass_valid_thru?: Date | string | null;
  hsse_pass_document_upload?: string | null;
  sika_document_upload?: string | null;
  simja_document_upload?: string | null;
  qrcode?: string | null;
  signer_position?: string | null;
  signer_name?: string | null;
  implementation_start_date?: string | null;
  implementation_end_date?: string | null;
  vendor_phone?: string | null;
  // Denormalized user data for preservation when user is deleted
  user_email?: string | null;
  user_officer_name?: string | null;
  user_vendor_name?: string | null;
  user_phone_number?: string | null;
  user_address?: string | null;
  user?: {
    id: string;
    officer_name: string;
    email: string;
    vendor_name: string;
  } | null;
  approved_by_final_user?: {
    id: string;
    officer_name: string;
    email: string;
  } | null;
  worker_list?: WorkerList[];
  support_documents?: SubmissionSupportDocument[];
}

// PDF Template data interface
export interface SubmissionPDFData {
  simlok_number?: string | null;
  simlok_date?: string | Date | null | undefined;
  implementation_start_date?: string | Date | null | undefined;
  implementation_end_date?: string | Date | null | undefined;
  vendor_name: string;
  
  // Documents
  simja_number?: string | null;
  simja_date?: string | Date | null | undefined;
  simja_type?: string | null;
  simja_document_upload?: string | null;
  sika_number?: string | null;
  sika_date?: string | Date | null | undefined;
  sika_type?: string | null;
  sika_document_upload?: string | null;
  
  // HSSE Pass
  hsse_pass_number?: string | null;
  hsse_pass_valid_thru?: string | Date | null | undefined;
  hsse_pass_document_upload?: string | null;
  
  // New support documents structure
  support_documents?: Array<{
    id: string;
    document_name: string;
    document_type: string;
    document_subtype?: string | null;
    document_number?: string | null;
    document_date?: string | Date | null;
    document_upload: string;
  }>;
  
  job_description: string;
  work_location: string;
  implementation: string | null;
  working_hours: string;
  work_facilities: string;
  worker_names?: string | null;
  worker_count?: number | null;
  content?: string | null;
  signer_position?: string | null;
  signer_name?: string | null;
  qrcode?: string;
  
  // Legacy field for compatibility (will be removed)
  other_notes?: string | null;
  approval_status?: string;
  
  // Worker list support
  workerList?: Array<{
    worker_name: string;
    worker_photo?: string | null;
  }>;
  worker_list?: Array<{
    worker_name: string;
    worker_photo?: string | null;
  }>;
}

export type SIMLOKOptions = {
  watermark?: boolean;
  showQR?: boolean;
  headerTitle?: string;
};

export type SubmissionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

// QR Scan related types
export interface QrScanData {
  id: string;
  submission_id: string;
  scanned_by: string;
  scanned_at: Date;
  scanner_name?: string | null;
  scan_location?: string | null;
  submission?: Submission;
  user?: {
    id: string;
    officer_name: string;
    email: string;
  };
}
