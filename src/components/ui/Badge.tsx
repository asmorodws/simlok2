"use client";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const variantClasses = {
    default: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-800 dark:text-emerald-200",
    warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-800 dark:text-amber-200",
    destructive: "border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-800 dark:text-red-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}