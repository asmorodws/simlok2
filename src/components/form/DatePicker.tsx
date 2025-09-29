'use client';

import React from 'react';
import ReactDatePicker from 'react-datepicker';

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

// DatePicker using react-datepicker for better reliability
export default function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  disabled = false,
  className = '',
  autoFocus = false
}: DatePickerProps) {
  // Convert string value to Date object
  const selectedDate = value ? new Date(value) : null;

  // Handle date change
  const handleChange = (date: Date | null) => {
    if (date && onChange) {
      // Format date to YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      onChange(formattedDate);
    } else if (!date && onChange) {
      onChange('');
    }
  };

  return (
    <div className="relative">
      <ReactDatePicker
        selected={selectedDate}
        onChange={handleChange}
        placeholderText={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        dateFormat="dd/MM/yyyy"
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${className}`}
        calendarClassName="react-datepicker-calendar"
        popperClassName="react-datepicker-popper"
        popperPlacement="bottom-start"
        showPopperArrow={false}
        isClearable={false}
        todayButton="Hari ini"
        onKeyDown={(e) => {
          // Mencegah pengetikan manual kecuali untuk navigasi
          if (
            e.key !== 'Tab' && 
            e.key !== 'Enter' && 
            e.key !== 'Escape' && 
            e.key !== 'ArrowUp' && 
            e.key !== 'ArrowDown' && 
            e.key !== 'ArrowLeft' && 
            e.key !== 'ArrowRight'
          ) {
            e.preventDefault();
          }
        }}
        onFocus={(e) => {
          // Membuka datepicker saat input mendapat focus
          e.target.blur();
          e.target.focus();
        }}
      />
    </div>
  );
}

