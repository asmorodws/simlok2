export interface SubmissionData {
  vendor_name: string;
  based_on: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation?: string; // akan diisi oleh admin saat approve
  working_hours: string;
  other_notes?: string; // akan diisi oleh admin saat approve
  work_facilities: string;
  simja_number?: string;
  simja_date?: string;
  sika_number?: string;
  sika_date?: string;
  worker_names: string;
  content?: string; // akan diisi oleh admin saat approve
  sika_document_upload?: string;
  simja_document_upload?: string;
}

export interface SubmissionApprovalData {
  approval_status: 'APPROVED' | 'REJECTED';
  notes?: string;
  simlok_number?: string;
  simlok_date?: string;
}

export interface WorkerList {
  id: string;
  worker_name: string;
  worker_photo?: string | null;
  submission_id: string;
  created_at: Date;
}

export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
