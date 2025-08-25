"use client";

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
    <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-blue-100 opacity-90">{subtitle}</p>}
        </div>
        {cta && <div className="flex-shrink-0">{cta}</div>}
      </div>
    </div>
  );
}