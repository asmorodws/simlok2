/**
 * SHARED: Submission Detail Modal Utilities and Components
 * Used by both Approver and Reviewer submission detail modals
 */

import React from 'react';
import { CalendarIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge/Badge';

/**
 * SHARED: SubmissionDetail interface
 * Base interface for submission details with all common fields
 */
export interface BaseSubmissionDetail {
  id: string;
  submission_name: string;
  vendor_name: string;
  vendor_phone?: string;
  user_email?: string;
  based_on: string;
  officer_name: string;
  officer_email?: string;
  job_description: string;
  work_location: string;
  implementation: string | null;
  working_hours: string;
  holiday_working_hours?: string | null;
  other_notes?: string;
  work_facilities: string;
  worker_count: number | null;
  
  // Document fields
  simja_number?: string;
  simja_date?: string | null;
  simja_type?: string | null;
  simja_document_upload?: string | null;
  
  sika_number?: string;
  sika_date?: string | null;
  sika_type?: string | null;
  sika_document_upload?: string | null;
  
  // HSSE Pass at submission level (optional)
  hsse_pass_number?: string | null;
  hsse_pass_valid_thru?: string | null;
  hsse_pass_document_upload?: string | null;
  
  // Supporting Documents 1
  supporting_doc1_type?: string;
  supporting_doc1_number?: string;
  supporting_doc1_date?: string | null;
  supporting_doc1_upload?: string;
  
  // Supporting Documents 2
  supporting_doc2_type?: string;
  supporting_doc2_number?: string;
  supporting_doc2_date?: string | null;
  supporting_doc2_upload?: string;
  
  simlok_number?: string | null;
  nomor_simlok?: string | null;  // Alternative name for simlok_number
  simlok_date?: string | null;
  implementation_start_date?: string | null;
  implementation_end_date?: string | null;
  
  worker_names: string;
  content: string;
  notes?: string;
  
  // Status fields
  review_status: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
  approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PENDING_REVIEW';
  
  // Notes for different roles
  note_for_approver?: string;
  note_for_vendor?: string;
  
  // Review/Approval metadata
  reviewed_by?: string;
  reviewed_by_email?: string;
  approved_by?: string;
  approved_by_email?: string;
  
  // QR Code
  qrcode?: string;
  
  // Timestamps
  created_at: string;
  reviewed_at?: string;
  approved_at?: string;
  
  // Signer info
  signer_position?: string;
  signer_name?: string;
  
  // Related data
  worker_list: Array<{
    id: string;
    worker_name: string;
    worker_photo: string | null;
    hsse_pass_number?: string | null;
    hsse_pass_valid_thru?: string | null;
    hsse_pass_document_upload?: string | null;
    created_at: string;
  }>;
  workers?: Array<{  // Alias for worker_list
    id: string;
    worker_name: string;
    worker_photo: string | null;
    hsse_pass_number?: string | null;
    hsse_pass_valid_thru?: string | null;
    hsse_pass_document_upload?: string | null;
    created_at: string;
  }>;
  
  support_documents?: Array<{
    id: string;
    document_name?: string;
    document_type: string;
    document_subtype?: string | null;
    document_number?: string | null;
    document_date?: Date | null;
    document_upload: string;
    uploaded_at: Date;
    uploaded_by: string;
  }>;
}

/**
 * SHARED: Format date for Indonesian locale display
 */
export const formatDate = (dateString: string | Date | null): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

/**
 * SHARED: Format work location with bullet points for comma-separated values
 */
export const formatWorkLocation = (location: string): React.ReactNode => {
  if (!location) return '-';

  // Check if location contains comma
  if (location.includes(',')) {
    const locations = location
      .split(',')
      .map((loc) => loc.trim())
      .filter((loc) => loc);
    return (
      <div className="space-y-1">
        {locations.map((loc, index) => (
          <div key={index} className="flex items-start text-sm font-normal text-gray-900">
            <span className="mr-2 mt-1">•</span>
            <span>{loc}</span>
          </div>
        ))}
      </div>
    );
  }

  return location;
};

/**
 * SHARED: Review Status Badge Component
 */
export const ReviewStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'PENDING_REVIEW':
      return (
        <Badge variant="warning">
          <CalendarIcon className="w-3 h-3 mr-1" />
          Menunggu Review
        </Badge>
      );
    case 'MEETS_REQUIREMENTS':
      return (
        <Badge variant="success">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          Sesuai Persyaratan
        </Badge>
      );
    case 'NOT_MEETS_REQUIREMENTS':
      return (
        <Badge variant="destructive">
          <XCircleIcon className="w-3 h-3 mr-1" />
          Tidak Memenuhi Syarat
        </Badge>
      );
    default:
      return (
        <Badge variant="default">
          Status Tidak Diketahui
        </Badge>
      );
  }
};

/**
 * SHARED: Final/Approval Status Badge Component
 */
export const ApprovalStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return (
        <Badge variant="info">
          <CalendarIcon className="w-3 h-3 mr-1" />
          Menunggu Persetujuan
        </Badge>
      );
    case 'PENDING_REVIEW':
      return (
        <Badge variant="warning">
          <CalendarIcon className="w-3 h-3 mr-1" />
          Menunggu Review Ulang
        </Badge>
      );
    case 'APPROVED':
      return (
        <Badge variant="success">
          <CheckCircleIcon className="w-3 h-3 mr-1" />
          Disetujui
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="destructive">
          <XCircleIcon className="w-3 h-3 mr-1" />
          Ditolak
        </Badge>
      );
    default:
      return (
        <Badge variant="default">
          Status Tidak Diketahui
        </Badge>
      );
  }
};

/**
 * SHARED: Generate auto SIMLOK number
 * Format: nomor/S00330/tahun-S0
 */
export const generateSimlokNumber = async (): Promise<string> => {
  // Use Jakarta timezone for year
  const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const now = new Date(jakartaNow);
  const year = now.getFullYear();

  try {
    // Fetch last SIMLOK number from server
    const response = await fetch(`/api/submissions/simlok/next-number?year=${year}`, {
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      return data.nextSimlokNumber; // Server returns format: "1/S00330/2025-S0"
    }

    // Fallback if API error
    console.warn('Failed to fetch next SIMLOK number, using fallback');
    return `1/S00330/${year}-S0`;
  } catch (error) {
    // Fallback if error
    console.error('Error generating SIMLOK number:', error);
    return `1/S00330/${year}-S0`;
  }
};

/**
 * SHARED: Parse SIMLOK date with Jakarta timezone
 */
export const parseSimlokDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const jakartaStr = date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const jakartaDate = new Date(jakartaStr);
  
  const year = jakartaDate.getFullYear();
  const month = String(jakartaDate.getMonth() + 1).padStart(2, '0');
  const day = String(jakartaDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};
