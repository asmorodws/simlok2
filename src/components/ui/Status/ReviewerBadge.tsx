"use client";
import StatusBadge, {
  ReviewStatus as _ReviewStatus,
  FinalStatus as _FinalStatus,
} from "@/components/ui/StatusBadge";

export type ReviewStatus = _ReviewStatus | string;
export type FinalStatus  = _FinalStatus  | string;

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <StatusBadge status={status} />;
}

export function FinalStatusBadge({ status }: { status: FinalStatus }) {
  return <StatusBadge status={status} />;
}

export function ScanStatusPill({
  approved,
  scanCount,
  lastScannedAt,
}: {
  approved: boolean;
  scanCount: number;
  lastScannedAt?: string | null;
}) {
  if (!approved) return <span className="text-xs text-gray-400">-</span>;
  if (scanCount > 0) {
    return (
      <div className="text-sm">
        <StatusBadge status="APPROVED" label={`Sudah discan (${scanCount}x)`} />
        {lastScannedAt && (
          <div className="text-xs text-gray-500 mt-1">
            Terakhir: {new Date(lastScannedAt).toLocaleDateString("id-ID", {
              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
            })}
          </div>
        )}
      </div>
    );
  }
  return <StatusBadge status="PENDING" label="Belum discan" />;
}
