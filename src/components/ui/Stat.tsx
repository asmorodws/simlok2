"use client";
import type { ComponentType } from "react";

export function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-sky-200/50 bg-sky-50/60 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-600">{label}</p>
        {Icon && <Icon className="h-5 w-5 text-slate-400" />}
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}