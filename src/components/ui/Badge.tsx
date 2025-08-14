"use client";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const variantClasses = {
    default: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
    success: "border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-800 dark:text-green-200",
    warning: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-800 dark:text-yellow-200",
    destructive: "border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-800 dark:text-red-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}