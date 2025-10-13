/**
 * Submission related types and interfaces
 */

import { ReviewStatus } from '@prisma/client';

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
  simja_number?: string;
  simja_date?: string;
  sika_number?: string;
  sika_date?: string;
  // Supporting Documents 1
  supporting_doc1_type?: string;
  supporting_doc1_number?: string;
  supporting_doc1_date?: string;
  supporting_doc1_upload?: string;
  // Supporting Documents 2
  supporting_doc2_type?: string;
  supporting_doc2_number?: string;
  supporting_doc2_date?: string;
  supporting_doc2_upload?: string;
  worker_names: string;
  content?: string; // akan diisi oleh admin saat approve
  sika_document_upload?: string;
  simja_document_upload?: string;
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
  submission_id: string;
  created_at: Date;
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
  sika_number?: string | null;
  sika_date?: string | null;
  // Supporting Documents
  supporting_doc1_type?: string | null;
  supporting_doc1_number?: string | null;
  supporting_doc1_date?: string | null;
  supporting_doc1_upload?: string | null;
  supporting_doc2_type?: string | null;
  supporting_doc2_number?: string | null;
  supporting_doc2_date?: string | null;
  supporting_doc2_upload?: string | null;
  sika_document_upload?: string | null;
  simja_document_upload?: string | null;
  qrcode?: string | null;
  signer_position?: string | null;
  signer_name?: string | null;
  implementation_start_date?: string | null;
  implementation_end_date?: string | null;
  vendor_phone?: string | null;
  user: {
    id: string;
    officer_name: string;
    email: string;
    vendor_name: string;
  };
  approved_by_final_user?: {
    id: string;
    officer_name: string;
    email: string;
  } | null;
  worker_list?: WorkerList[];
}

// PDF Template data interface
export interface SubmissionPDFData {
  simlok_number?: string | null;
  simlok_date?: string | Date | null | undefined;
  implementation_start_date?: string | Date | null | undefined;
  implementation_end_date?: string | Date | null | undefined;
  vendor_name: string;
  
  // Supporting Documents 1 & 2 - Replacing SIMJA & SIKA
  supporting_doc1_type?: string | null;
  supporting_doc1_number?: string | null;
  supporting_doc1_date?: string | Date | null | undefined;
  supporting_doc1_upload?: string | null;
  supporting_doc2_type?: string | null;
  supporting_doc2_number?: string | null;
  supporting_doc2_date?: string | Date | null | undefined;
  supporting_doc2_upload?: string | null;
  
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
