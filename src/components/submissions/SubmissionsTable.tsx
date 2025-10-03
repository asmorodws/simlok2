// components/submissions/SubmissionsTable.tsx
"use client";

import Button from "../ui/button/Button";
import StatusBadge from "../ui/StatusBadge";

export interface SubmissionRow {
  id: string;
  job_description: string;
  officer_name: string;
  work_location: string;
  work_hours: string; // Added property
  approval_status: string;
  simlok_number?: string | null;
  created_at: string;
}

interface Props {
  submissions: SubmissionRow[];
  loading: boolean;
  onView: (submission: SubmissionRow) => void;
  onDelete: (id: string) => void;
  formatDate: (date: string) => string;
}

export default function SubmissionsTable({
  submissions,
  loading,
  onView,
  onDelete,
  formatDate
}: Props) {
  console.log('SubmissionsTable: received submissions:', submissions);
  console.log('SubmissionsTable: sample submission:', submissions?.[0]);
  
  return (
    <div className="hidden md:block rounded-xl border bg-white overflow-hidden">
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-[35%]" />
          <col className="w-[35%]" />
          <col className="w-[15%]" />
          <col className="w-[15%]" />
        </colgroup>
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left text-sm font-semibold text-gray-900">Pekerjaan</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-900">Lokasi & Jam Kerja</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-900">Status &amp; Tanggal</th>

            <th className="p-3 text-left text-sm font-semibold text-gray-900">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={5} className="p-6 text-center text-gray-500">Memuat…</td>
            </tr>
          ) : submissions.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-6 text-center text-gray-500">Belum ada pengajuan</td>
            </tr>
          ) : (
            submissions.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-3 align-top">
                  <div className="text-sm font-medium text-gray-900">{s.job_description}</div>
                  <div className="text-xs text-gray-500">{s.officer_name}</div>
                </td>
                <td className="p-3 align-top text-sm text-gray-700">{s.work_location}
                    <div>
                        <span className="text-xs text-gray-500">{s.work_hours}</span>
                    </div>
                </td>
                <td className="p-3 align-top">
                  <div className="flex flex-col gap-1">
                    <StatusBadge status={s.approval_status} />
                    <span className="text-xs text-gray-500">{formatDate(s.created_at)}</span>
                  </div>
                </td>
                <td className="p-3 align-top w-0 whitespace-nowrap">
                  <div className="flex gap-1">
                    <Button onClick={() => onView(s)} variant="info" size="sm" className="text-xs">Lihat</Button>
                    {s.approval_status === "PENDING" && (
                      <Button onClick={() => onDelete(s.id)} variant="destructive" size="sm" className="text-xs">Hapus</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
