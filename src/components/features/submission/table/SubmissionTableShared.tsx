import { Badge } from '@/components/ui/badge/Badge';
import type { ReactNode } from 'react';

// Shared submission types
export type ReviewStatus = 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
export type ApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

// Badge components
export function ReviewStatusBadge({ status }: { status: ReviewStatus | string }) {
  switch (status) {
    case 'PENDING_REVIEW':
      return <Badge variant="warning">Menunggu Review</Badge>;
    case 'MEETS_REQUIREMENTS':
      return <Badge variant="success">Memenuhi Syarat</Badge>;
    case 'NOT_MEETS_REQUIREMENTS':
      return <Badge variant="destructive">Tidak Memenuhi Syarat</Badge>;
    default:
      return <Badge variant="default">{String(status)}</Badge>;
  }
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus | string }) {
  switch (status) {
    case 'PENDING_APPROVAL':
      return <Badge variant="warning">Menunggu Persetujuan</Badge>;
    case 'APPROVED':
      return <Badge variant="success">Disetujui</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Ditolak</Badge>;
    default:
      return <Badge variant="default">{String(status)}</Badge>;
  }
}

// Date formatters
export function formatSubmissionDate(dateString: string): ReactNode {
  return (
    <div>
      <div className="text-sm font-medium text-gray-900">
        {new Date(dateString).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </div>
      <div className="text-xs text-gray-500">
        {new Date(dateString).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}

// Base submission interface (common fields)
export interface BaseSubmission extends Record<string, unknown> {
  id: string;
  review_status: ReviewStatus;
  approval_status: ApprovalStatus;
  vendor_name: string;
  based_on: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation: string | null;
  working_hours: string;
  other_notes?: string;
  work_facilities: string;
  simja_number?: string | null;
  simja_date?: string | null;
  sika_number?: string | null;
  sika_date?: string | null;
  simlok_number?: string | null;
  simlok_date?: string | null;
  worker_names?: string | null;
  content?: string | null;
  notes?: string | null;
  created_at: string | Date;
  reviewed_at?: string | null;
  approved_at?: string | null;
  worker_count?: number | null;
  holiday_working_hours?: string | null;
  implementation_start_date?: string | null;
  implementation_end_date?: string | null;
}
