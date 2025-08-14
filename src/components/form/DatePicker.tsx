'use client';

import { forwardRef, useState, useEffect } from 'react';
import ReactDatePicker from 'react-datepicker';
import { CalendarIcon } from '@heroicons/react/24/outline';
import "react-datepicker/dist/react-datepicker.css";

interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showTimeSelect?: boolean;
  timeIntervals?: number;
  dateFormat?: string;
  className?: string;
}

// Custom input component
const CustomInput = forwardRef<HTMLInputElement, any>(({ value, onClick, placeholder, disabled, className }, ref) => (
  <div className="relative">
    <input
      ref={ref}
      value={value}
      onClick={onClick}
      placeholder={placeholder}
      readOnly
      disabled={disabled}
      className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className || ''}`}
    />
    <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
  </div>
));

CustomInput.displayName = 'CustomInput';

export default function DatePicker({
  id,
  name,
  value,
  onChange,
  placeholder = "Pilih tanggal",
  required = false,
  disabled = false,
  showTimeSelect = false,
  timeIntervals = 15,
  dateFormat = "dd/MM/yyyy",
  className
}: DatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Update selectedDate when value prop changes
  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (onChange) {
      onChange(date ? date.toISOString().split('T')[0] : '');
    }
  };

  return (
    <ReactDatePicker
      id={id}
      name={name}
      selected={selectedDate}
      onChange={handleDateChange}
      showTimeSelect={showTimeSelect}
      timeIntervals={timeIntervals}
      dateFormat={showTimeSelect ? `${dateFormat} HH:mm` : dateFormat}
      placeholderText={placeholder}
      disabled={disabled}
      required={required}
      customInput={<CustomInput className={className} />}
      popperClassName="react-datepicker-popper"
      calendarClassName="react-datepicker-calendar"
      locale="id"
      todayButton="Hari ini"
      showPopperArrow={false}
      popperPlacement="bottom-start"
    />
  );
}
