"use client";

import React, { ReactNode } from "react";
import Button from "@/components/ui/button/Button";
import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckIcon, 
  XMarkIcon,
  DocumentIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  PlusIcon
} from "@heroicons/react/24/outline";

interface ActionButtonProps {
  action: "view" | "edit" | "delete" | "approve" | "reject" | "download" | "share" | "add" | "custom";
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning" | "info" | undefined;
  customIcon?: ReactNode;
  customLabel?: string;
  tooltip?: string;
  className?: string;
}

const actionConfig = {
  view: {
    icon: EyeIcon,
    label: "Lihat",
    variant: "outline" as const
  },
  edit: {
    icon: PencilIcon,
    label: "Edit",
    variant: "outline" as const
  },
  delete: {
    icon: TrashIcon,
    label: "Hapus",
    variant: "destructive" as const
  },
  approve: {
    icon: CheckIcon,
    label: "Setujui",
    variant: "success" as const
  },
  reject: {
    icon: XMarkIcon,
    label: "Tolak",
    variant: "destructive" as const
  },
  download: {
    icon: ArrowDownTrayIcon,
    label: "Unduh",
    variant: "outline" as const
  },
  share: {
    icon: ShareIcon,
    label: "Bagikan",
    variant: "outline" as const
  },
  add: {
    icon: PlusIcon,
    label: "Tambah",
    variant: "primary" as const
  },
  custom: {
    icon: DocumentIcon,
    label: "Aksi",
    variant: "outline" as const
  }
};

export default function ActionButton({
  action,
  onClick,
  disabled = false,
  loading = false,
  size = "sm",
  variant,
  customIcon,
  customLabel,
  tooltip,
  className = ""
}: ActionButtonProps) {
  const config = actionConfig[action];
  const IconComponent = config.icon;
  const label = customLabel || config.label;
  const buttonVariant = variant || config.variant;

  const renderIcon = () => {
    if (loading) {
      return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>;
    }
    
    if (customIcon) {
      return customIcon;
    }
    
    return <IconComponent className="h-4 w-4" />;
  };

  const buttonProps: any = {
    onClick,
    disabled: disabled || loading,
    variant: buttonVariant,
    size,
    className: `${size === "sm" ? "!px-2 !py-1" : ""} ${className}`,
    startIcon: renderIcon()
  };

  if (tooltip) {
    buttonProps.title = tooltip;
  }

  return (
    <Button {...buttonProps}>
      {size !== "sm" && label}
    </Button>
  );
}

// Group of action buttons for common operations
interface ActionButtonGroupProps {
  actions: Array<{
    action: ActionButtonProps["action"];
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    customIcon?: ReactNode;
    customLabel?: string;
    tooltip?: string;
    variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning" | "info";
  }>;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ActionButtonGroup({ 
  actions, 
  size = "sm", 
  className = "" 
}: ActionButtonGroupProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {actions.map((actionProps, index) => {
        const { variant, ...restProps } = actionProps;
        return (
          <ActionButton
            key={index}
            {...restProps}
            variant={variant}
            size={size}
          />
        );
      })}
    </div>
  );
}