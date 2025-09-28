"use client";

import React, { ReactNode } from "react";
import Button from "@/components/ui/button/Button";

interface PageHeaderProps {
  title: string;
  subtitle?: string | undefined;
  description?: string | undefined;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning" | "info";
  } | undefined;
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning" | "info";
  }> | undefined;
  children?: ReactNode;
  className?: string;
  // Legacy props for backward compatibility
  cta?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  description,
  primaryAction,
  secondaryActions = [],
  children,
  className = "",
  // Legacy compatibility
  cta
}: PageHeaderProps) {
  return (
    <div className={`bg-white shadow-sm rounded-xl border border-gray-200/70 ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-semibold text-gray-900">
                {title}
              </h1>
              {subtitle && (
                <span className="text-sm text-gray-500 font-medium">
                  {subtitle}
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-gray-600 mt-1">
                {description}
              </p>
            )}
          </div>
          
          {/* New action buttons */}
          {(primaryAction || secondaryActions.length > 0) && (
            <div className="flex flex-col sm:flex-row gap-2">
              {secondaryActions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  variant={action.variant || "outline"}
                  size="md"
                  startIcon={action.icon}
                  className="whitespace-nowrap"
                >
                  {action.label}
                </Button>
              ))}
              {primaryAction && (
                <Button
                  onClick={primaryAction.onClick}
                  variant={primaryAction.variant || "primary"}
                  size="md"
                  startIcon={primaryAction.icon}
                  className="whitespace-nowrap"
                >
                  {primaryAction.label}
                </Button>
              )}
            </div>
          )}
          
          {/* Legacy CTA support */}
          {cta && !primaryAction && !secondaryActions.length && (
            <div className="flex-shrink-0">{cta}</div>
          )}
        </div>
        
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}