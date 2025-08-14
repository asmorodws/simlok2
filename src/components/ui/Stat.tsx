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
    <div className="rounded-2xl border border-sky-200/50 bg-sky-50/60 p-5 shadow-sm dark:border-sky-700/40 dark:bg-sky-900/30">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-600 dark:text-sky-200">{label}</p>
        {Icon && <Icon className="h-5 w-5 text-slate-400 dark:text-sky-300" />}
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}