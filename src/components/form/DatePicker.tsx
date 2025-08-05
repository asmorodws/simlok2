'use client';

import React, { useEffect, useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import { toJakartaISOString } from '@/lib/timezone';
import { useServerTime } from '@/hooks/useServerTime';

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

// DatePicker using react-datepicker with server time sync
export default function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  disabled = false,
  className = '',
  autoFocus = false
}: DatePickerProps) {
  const { getCurrentServerTime, getCurrentDate, isLoaded } = useServerTime();
  const [todayDate, setTodayDate] = useState<Date | null>(null);

  // Update today date when server time is loaded
  useEffect(() => {
    if (isLoaded) {
      setTodayDate(getCurrentServerTime());
    }
  }, [isLoaded, getCurrentServerTime]);

  // Convert string value to Date object anchored at Jakarta timezone
  const selectedDate = value ? new Date(`${value}T00:00:00+07:00`) : null;

  // Get real Jakarta time from server (not device time) for calculating min/max dates
  const serverTime = todayDate || getCurrentServerTime();
  const currentYear = serverTime.getFullYear();
  
  // MinDate: 1 Jan 2020 Jakarta time
  const minDate = new Date('2020-01-01T00:00:00+07:00');
  
  // MaxDate: 31 Des tahun sekarang + 5 (Jakarta) - dihitung dari waktu real server
  const maxDate = new Date(`${currentYear + 5}-12-31T23:59:59+07:00`);

  // Handle date change
  const handleChange = (date: Date | null) => {
    if (date && onChange) {
      // Ensure we use Jakarta date when converting selected Date to YYYY-MM-DD
      const jakartaIso = (toJakartaISOString(date) || date.toISOString()) as string;
      const formattedDate: string = (jakartaIso.split('T')[0] || '');
      onChange(formattedDate);
    } else if (!date && onChange) {
      onChange('');
    }
  };

  // Custom handler for "Today" button - uses server time instead of browser time
  const handleTodayClick = () => {
    if (onChange) {
      // Use server date (YYYY-MM-DD format from Jakarta timezone)
      const serverDate = getCurrentDate();
      onChange(serverDate);
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
        isClearable={true}
        {...(todayDate ? { openToDate: todayDate } : {})}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        minDate={minDate}
        maxDate={maxDate}
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
      >
        {/* Custom Today Button - uses server time instead of browser time */}
        <div className="react-datepicker__today-button-custom" onClick={handleTodayClick}>
          Hari ini
        </div>
      </ReactDatePicker>
      <style jsx global>{`
        /* Styling untuk tombol clear di DatePicker */
        .react-datepicker__close-icon {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background-color: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          height: 20px;
          width: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        .react-datepicker__close-icon::after {
          content: '×';
          font-size: 20px;
          color: #9ca3af;
          background-color: #f3f4f6;
          border-radius: 50%;
          height: 20px;
          width: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .react-datepicker__close-icon:hover::after {
          background-color: #ef4444;
          color: white;
        }

        /* Berikan padding kanan lebih untuk input agar tidak tertutup tombol clear */
        .react-datepicker__input-container input:not(:placeholder-shown) {
          padding-right: 35px;
        }

        /* Styling datepicker header - Simple & Clean */
        .react-datepicker__header {
          background-color: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 0;
        }

        .react-datepicker__current-month {
          display: none; /* Hide karena sudah ada dropdown */
        }

        .react-datepicker__day-name {
          color: #6b7280;
          font-weight: 500;
          font-size: 13px;
          margin: 4px;
        }

        /* Container untuk dropdown */
        .react-datepicker__month-dropdown-container,
        .react-datepicker__year-dropdown-container {
          margin: 0 4px;
        }

        /* Styling dropdown bulan dan tahun - Simple */
        .react-datepicker__month-select,
        .react-datepicker__year-select {
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background-color: white;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          margin: 0 2px;
        }

        .react-datepicker__month-select:hover,
        .react-datepicker__year-select:hover {
          border-color: #3b82f6;
        }

        .react-datepicker__month-select:focus,
        .react-datepicker__year-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        /* Calendar styling */
        .react-datepicker {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          font-family: inherit;
        }

        .react-datepicker__month {
          margin: 8px;
        }

        .react-datepicker__day {
          border-radius: 6px;
          margin: 2px;
          font-size: 13px;
          transition: all 0.15s;
        }

        .react-datepicker__day:hover {
          background-color: #eff6ff;
          color: #3b82f6;
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: #3b82f6 !important;
          color: white !important;
          font-weight: 500;
        }

        .react-datepicker__day--selected:hover,
        .react-datepicker__day--keyboard-selected:hover {
          background-color: #2563eb !important;
          color: white !important;
        }

        .react-datepicker__day--today {
          font-weight: 600;
          color: #3b82f6;
          background-color: #eff6ff;
        }

        .react-datepicker__day--today.react-datepicker__day--selected {
          background-color: #3b82f6 !important;
          color: white !important;
        }

        .react-datepicker__day--disabled {
          color: #d1d5db;
          cursor: not-allowed;
        }

        .react-datepicker__day--disabled:hover {
          background-color: transparent;
        }

        /* Today button - Simple */
        .react-datepicker__today-button {
          background-color: white;
          border-top: 1px solid #e5e7eb;
          padding: 10px;
          text-align: center;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          color: #3b82f6;
          transition: all 0.15s;
        }

        .react-datepicker__today-button:hover {
          background-color: #f9fafb;
        }

        /* Custom Today button - uses server time */
        .react-datepicker__today-button-custom {
          background-color: white;
          border-top: 1px solid #e5e7eb;
          padding: 10px;
          text-align: center;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          color: #3b82f6;
          transition: all 0.15s;
        }

        .react-datepicker__today-button-custom:hover {
          background-color: #f9fafb;
        }

        /* Navigation arrows */
        .react-datepicker__navigation {
          top: 12px;
        }

        .react-datepicker__navigation-icon::before {
          border-color: #6b7280;
          border-width: 2px 2px 0 0;
        }

        .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
          border-color: #3b82f6;
        }
      `}</style>
    </div>
  );
}

