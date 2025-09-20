"use client";
import React from "react";
import { cn } from "@/lib/utils";

type ModalProps = {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
};

export const Modal: React.FC<ModalProps> = ({
  children,
  isOpen,
  onClose,
  className,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[99] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed left-1/2 top-1/2 z-[999] -translate-x-1/2 -translate-y-1/2",
          className
        )}
      >
        {children}
      </div>
    </>
  );
};