interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variantClasses = {
    default:      "border-slate-200 bg-slate-50 text-slate-700",
    success:      "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning:      "border-amber-200 bg-amber-50 text-amber-700",
    destructive:  "border-red-200 bg-red-50 text-red-700",
    info:         "border-blue-200 bg-blue-50 text-blue-700",  // ← ditambahkan
  };

  const inlineStyle = variant === 'destructive' ? {
    borderColor: '#ef4444 !important',
    backgroundColor: '#ef4444 !important',
    color: '#ffffff !important',
    fontWeight: '600'
  } : {};

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${variantClasses[variant]} ${className}`}
      style={inlineStyle}
    >
      {children}
    </span>
  );
}
