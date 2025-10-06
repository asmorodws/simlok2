// components/submissions/SubmissionsCardView.tsx
"use client";

import Button from "../ui/button/Button";

import type { SubmissionRow } from "./SubmissionsTable";

interface Props {
  submissions: SubmissionRow[];
  loading: boolean;
  onView: (submission: SubmissionRow) => void;
  onDelete: (id: string) => void;
  formatDate: (date: string) => string;
}

export default function SubmissionsCardView({
  submissions,
  loading,
  onView,
  onDelete,
  formatDate
}: Props) {
  const getVendorStatus = (reviewStatus: string, approvalStatus: string) => {
    // Status final - sudah selesai
    if (approvalStatus === 'APPROVED') {
      return {
        label: 'Disetujui',
        color: 'bg-green-100 text-green-800',
        description: 'Pengajuan telah disetujui dan dapat dilaksanakan'
      };
    }
    
    if (approvalStatus === 'REJECTED') {
      return {
        label: 'Ditolak',
        color: 'bg-red-100 text-red-800',
        description: 'Pengajuan ditolak'
      };
    }

    // Status dalam proses
    if (reviewStatus === 'PENDING_REVIEW') {
      return {
        label: 'Sedang Direview',
        color: 'bg-blue-100 text-blue-800',
        description: 'Pengajuan sedang dalam tahap review'
      };
    }

    if (reviewStatus === 'MEETS_REQUIREMENTS') {
      return {
        label: 'Menunggu Persetujuan Final',
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Review selesai, menunggu persetujuan final'
      };
    }

    if (reviewStatus === 'NEEDS_REVISION') {
      return {
        label: 'Perlu Revisi',
        color: 'bg-orange-100 text-orange-800',
        description: 'Pengajuan perlu diperbaiki'
      };
    }

    // Default fallback
    return {
      label: 'Sedang Diproses',
      color: 'bg-gray-100 text-gray-800',
      description: 'Pengajuan sedang dalam proses'
    };
  };

  return (
    <div className="md:hidden space-y-3">
      {loading ? (
        <div className="text-center py-6 text-gray-500">Memuat…</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-6 text-gray-500">Belum ada pengajuan</div>
      ) : (
        submissions.map((s) => {
          const status = getVendorStatus(s.review_status, s.approval_status);
          return (
            <div key={s.id} className="bg-white border rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{s.job_description}</h4>
                  <p className="text-xs text-gray-500">{s.officer_name}</p>
                </div>
                <div className="ml-3 flex flex-col items-end">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color} inline-block`}>
                    {status.label}
                  </span>
                  <span className="text-xs text-gray-500 mt-1 text-right max-w-24">
                    {status.description}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-700">
                <span className="font-medium">Lokasi:</span> {s.work_location}
              </div>
              <div className="mt-1 text-xs text-gray-500">{formatDate(s.created_at)}</div>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => onView(s)} variant="info" size="sm" className="text-xs">Lihat</Button>
                {(s.approval_status === "PENDING_APPROVAL" && s.review_status === "PENDING_REVIEW") && (
                  <Button onClick={() => onDelete(s.id)} variant="destructive" size="sm" className="text-xs">Hapus</Button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
