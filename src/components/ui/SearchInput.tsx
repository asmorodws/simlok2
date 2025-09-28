"use client";

import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

const sizeClasses = {
  sm: "h-8 pl-8 pr-3 text-sm",
  md: "h-10 pl-10 pr-4 text-sm", 
  lg: "h-12 pl-12 pr-4 text-base"
};

const iconSizeClasses = {
  sm: "h-3 w-3 left-2.5",
  md: "h-4 w-4 left-3",
  lg: "h-5 w-5 left-4"
};

export default function SearchInput({
  value,
  onChange,
  placeholder = "Cari...",
  className = "",
  size = "md",
  disabled = false
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <MagnifyingGlassIcon 
        className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${iconSizeClasses[size]}`} 
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full border border-gray-300 rounded-lg 
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          transition-colors duration-200
          ${sizeClasses[size]}
        `}
      />
    </div>
  );
}