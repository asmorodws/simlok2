"use client";
import type { ReactNode } from "react";

type BasicStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ReviewStatus = "PENDING_REVIEW" | "MEETS_REQUIREMENTS" | "NOT_MEETS_REQUIREMENTS";
export type FinalStatus  = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
export type StatusCode   = BasicStatus | ReviewStatus | FinalStatus | (string & {});

interface StatusBadgeProps {
  status: StatusCode;
  label?: string;
  className?: string;
  children?: ReactNode; // kalau suatu saat mau isi custom
}

const BASE = "inline-block font-semibold rounded-md px-1.5 py-0.5 text-[11px]";

const STATUS_MAP = {
  PENDING: { label: "Menunggu", className: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "Disetujui", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Ditolak", className: "bg-red-100 text-red-700" },
  PENDING_REVIEW: { label: "Menunggu Review", className: "bg-yellow-100 text-yellow-800" },
  MEETS_REQUIREMENTS: { label: "Memenuhi Syarat", className: "bg-green-100 text-green-700" },
  NOT_MEETS_REQUIREMENTS: { label: "Tidak Memenuhi Syarat", className: "bg-red-100 text-red-700" },
  PENDING_APPROVAL: { label: "Menunggu Persetujuan", className: "bg-yellow-100 text-yellow-800" },
} as const;

type KnownStatus = keyof typeof STATUS_MAP;
type StatusMeta  = (typeof STATUS_MAP)[KnownStatus];

function getStatusMeta(s: StatusCode): StatusMeta | undefined {
  const key = s as string;
  if (Object.prototype.hasOwnProperty.call(STATUS_MAP, key)) {
    return STATUS_MAP[key as KnownStatus];
  }
  return undefined;
}

export default function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const meta = getStatusMeta(status);

  if (meta) {
    return (
      <span className={`${BASE} ${meta.className} ${className ?? ""}`}>
        {label ?? meta.label}
      </span>
    );
  }

  return (
    <span className={`${BASE} bg-gray-100 text-gray-800 ${className ?? ""}`}>
      {label ?? String(status)}
    </span>
  );
}
