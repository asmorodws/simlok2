'use client';

import React from 'react';

export interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

// DatePicker native only, crash-proof
export default function DatePicker({
  id,
  name,
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  required = false,
  disabled = false,
  className = '',
  autoFocus = false
}: DatePickerProps) {
  return (
    <input
      id={id}
      name={name}
      type="date"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${className}`}
      autoFocus={autoFocus}
    />
  );
}

