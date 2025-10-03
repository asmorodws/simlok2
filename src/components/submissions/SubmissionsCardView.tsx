// components/submissions/SubmissionsCardView.tsx
"use client";

import Button from "../ui/button/Button";
import StatusBadge from "../ui/StatusBadge";

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
  return (
    <div className="md:hidden space-y-3">
      {loading ? (
        <div className="text-center py-6 text-gray-500">Memuat…</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-6 text-gray-500">Belum ada pengajuan</div>
      ) : (
        submissions.map((s) => (
          <div key={s.id} className="bg-white border rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{s.job_description}</h4>
                <p className="text-xs text-gray-500">{s.officer_name}</p>
              </div>
              <StatusBadge status={s.approval_status} />
            </div>
            <div className="mt-2 text-sm text-gray-700">
              <span className="font-medium">Lokasi:</span> {s.work_location}
            </div>
            <div className="mt-1 text-xs text-gray-500">{formatDate(s.created_at)}</div>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => onView(s)} variant="info" size="sm" className="text-xs">Lihat</Button>
              {s.approval_status === "PENDING" && (
                <Button onClick={() => onDelete(s.id)} variant="destructive" size="sm" className="text-xs">Hapus</Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
