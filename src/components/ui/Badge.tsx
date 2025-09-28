"use client";

import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "pending" | "approved" | "rejected" | "verified" | "unverified";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Badge({ 
  children, 
  variant = "default", 
  size = "md",
  className = "" 
}: BadgeProps) {
  const variantClasses = {
    default: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    destructive: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-red-200 bg-red-50 text-red-700",
    verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
    unverified: "border-gray-200 bg-gray-50 text-gray-700",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  // Force red styling with inline styles for destructive variant
  const inlineStyle = variant === 'destructive' ? {
    borderColor: '#ef4444 !important',
    backgroundColor: '#ef4444 !important',
    color: '#ffffff !important',
    fontWeight: '600'
  } : {};

  return (
    <span 
      className={`inline-flex items-center rounded-full border font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      style={inlineStyle}
    >
      {children}
    </span>
  );
}

// Export StatusBadge for backward compatibility and specific use cases
export function StatusBadge({ 
  status, 
  size = "md",
  className = "" 
}: { 
  status: string; 
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const getVariantFromStatus = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case 'pending':
      case 'menunggu':
      case 'menunggu review':
      case 'draft':
        return 'pending';
      case 'approved':
      case 'disetujui':
      case 'active':
      case 'aktif':
        return 'approved';
      case 'rejected':
      case 'ditolak':
      case 'declined':
      case 'cancelled':
      case 'dibatalkan':
        return 'rejected';
      case 'verified':
      case 'terverifikasi':
        return 'verified';
      case 'unverified':
      case 'belum terverifikasi':
      case 'not verified':
        return 'unverified';
      case 'in progress':
      case 'processing':
      case 'sedang diproses':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDING': 'Menunggu Review',
      'APPROVED': 'Disetujui',
      'REJECTED': 'Ditolak',
      'DRAFT': 'Draft',
      'IN_PROGRESS': 'Sedang Diproses',
      'COMPLETED': 'Selesai',
      'CANCELLED': 'Dibatalkan',
      'VERIFIED': 'Terverifikasi',
      'UNVERIFIED': 'Belum Terverifikasi',
    };

    return statusMap[status.toUpperCase()] || status;
  };

  return (
    <Badge 
      variant={getVariantFromStatus(status)} 
      size={size}
      className={className}
    >
      {getStatusText(status)}
    </Badge>
  );
}