"use client";

import React, { ReactNode } from "react";
import Button from "@/components/ui/button/Button";
import { 
  DocumentTextIcon,
  FolderIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

interface EmptyStateProps {
  icon?: ReactNode | "document" | "folder" | "users" | "warning";
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning" | "info";
  };
  className?: string;
}

const iconMap = {
  document: DocumentTextIcon,
  folder: FolderIcon, 
  users: UserGroupIcon,
  warning: ExclamationTriangleIcon
};

export default function EmptyState({
  icon = "document",
  title,
  description,
  action,
  className = ""
}: EmptyStateProps) {
  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    
    if (typeof icon === "string" && iconMap[icon as keyof typeof iconMap]) {
      const IconComponent = iconMap[icon as keyof typeof iconMap];
      return <IconComponent className="h-12 w-12 text-gray-400" />;
    }
    
    return <DocumentTextIcon className="h-12 w-12 text-gray-400" />;
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-4">
        {renderIcon()}
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-gray-600 mb-6 max-w-sm">
          {description}
        </p>
      )}
      
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "primary"}
          size="md"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}