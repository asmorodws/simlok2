"use client";
import type { ReactNode } from "react";

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-slate-900">{children}</h2>
      {right}
    </div>
  );
}