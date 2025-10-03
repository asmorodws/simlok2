// components/ui/StatusBadge.tsx
"use client";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const base = "inline-block font-semibold rounded-md px-1.5 py-0.5 text-[11px]";
  switch (status) {
    case "PENDING":
      return <span className={`${base} bg-yellow-100 text-yellow-800`}>Menunggu</span>;
    case "APPROVED":
      return <span className={`${base} bg-green-100 text-green-700`}>Disetujui</span>;
    case "REJECTED":
      return <span className={`${base} bg-red-100 text-red-700`}>Ditolak</span>;
    default:
      return <span className={`${base} bg-gray-100 text-gray-800`}>{status}</span>;
  }
}
