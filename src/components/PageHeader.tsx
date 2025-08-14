"use client";
import { Badge } from "./ui/Badge";

export default function PageHeader({
  title,
  subtitle,
  cta,
}: {
  title: string;
  subtitle?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-gray-900 to-emerald-400 p-8 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1/2 opacity-90">{subtitle}</p>}
        </div>
        {cta}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>Performance</Badge>
        <Badge>This week</Badge>
      </div>
    </div>
  );
}