'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { CalendarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (value: DateRange) => void;
  startLabel?: string;
  endLabel?: string;
  disabled?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
  required?: boolean;
  error?: string;
}

/**
 * Robust Date Range Picker with validation and auto-template generation
 */
export default function DateRangePicker({
  value = { startDate: '', endDate: '' },
  onChange,
  startLabel = 'Tanggal Mulai',
  endLabel = 'Tanggal Selesai',
  disabled = false,
  className = '',
  minDate,
  maxDate,
  required = false,
  error
}: DateRangePickerProps) {
  const [dateRange, setDateRange] = useState<DateRange>(value);
  const [errors, setErrors] = useState<{ start?: string; end?: string }>({});

  // Sync with external value
  useEffect(() => {
    setDateRange(value);
  }, [value]);

  // Validate date range
  const validateDateRange = useCallback((range: DateRange): { start?: string; end?: string } => {
    const errors: { start?: string; end?: string } = {};
    
    // Validate start date
    if (required && !range.startDate) {
      errors.start = 'Tanggal mulai wajib diisi';
    } else if (range.startDate) {
      const startDate = new Date(range.startDate);
      if (isNaN(startDate.getTime())) {
        errors.start = 'Format tanggal tidak valid';
      } else {
        // Check min date
        if (minDate && startDate < new Date(minDate)) {
          errors.start = `Tanggal tidak boleh sebelum ${new Date(minDate).toLocaleDateString('id-ID')}`;
        }
        // Check max date
        if (maxDate && startDate > new Date(maxDate)) {
          errors.start = `Tanggal tidak boleh setelah ${new Date(maxDate).toLocaleDateString('id-ID')}`;
        }
      }
    }

    // Validate end date
    if (required && !range.endDate) {
      errors.end = 'Tanggal selesai wajib diisi';
    } else if (range.endDate) {
      const endDate = new Date(range.endDate);
      if (isNaN(endDate.getTime())) {
        errors.end = 'Format tanggal tidak valid';
      } else {
        // Check min date
        if (minDate && endDate < new Date(minDate)) {
          errors.end = `Tanggal tidak boleh sebelum ${new Date(minDate).toLocaleDateString('id-ID')}`;
        }
        // Check max date
        if (maxDate && endDate > new Date(maxDate)) {
          errors.end = `Tanggal tidak boleh setelah ${new Date(maxDate).toLocaleDateString('id-ID')}`;
        }
        // Check if end date is after start date
        if (range.startDate && endDate < new Date(range.startDate)) {
          errors.end = 'Tanggal selesai harus setelah tanggal mulai';
        }
      }
    }

    return errors;
  }, [minDate, maxDate, required]);

  // Handle start date change
  const handleStartDateChange = useCallback((newStartDate: string) => {
    const newRange = { ...dateRange, startDate: newStartDate };
    setDateRange(newRange);
    
    const validationErrors = validateDateRange(newRange);
    setErrors(validationErrors);
    
    if (onChange && Object.keys(validationErrors).length === 0) {
      onChange(newRange);
    }
  }, [dateRange, onChange, validateDateRange]);

  // Handle end date change
  const handleEndDateChange = useCallback((newEndDate: string) => {
    const newRange = { ...dateRange, endDate: newEndDate };
    setDateRange(newRange);
    
    const validationErrors = validateDateRange(newRange);
    setErrors(validationErrors);
    
    if (onChange && Object.keys(validationErrors).length === 0) {
      onChange(newRange);
    }
  }, [dateRange, onChange, validateDateRange]);

  // Calculate duration
  const getDuration = useCallback((): number | null => {
    if (!dateRange.startDate || !dateRange.endDate) return null;
    
    try {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
      
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end dates
      
      return diffDays > 0 ? diffDays : null;
    } catch (error) {
      return null;
    }
  }, [dateRange]);

  // Format date for display
  const formatDateForDisplay = useCallback((dateStr: string): string => {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return '';
    }
  }, []);

  const duration = getDuration();
  const hasValidRange = dateRange.startDate && dateRange.endDate && Object.keys(errors).length === 0;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {startLabel}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              disabled={disabled}
              min={minDate}
              max={maxDate}
              className={`
                w-full px-3 py-2 pr-10 border rounded-md transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${errors.start 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 hover:border-gray-400'
                }
                ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'}
              `}
            />
            <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {errors.start && (
            <div className="mt-1 text-sm text-red-600 flex items-center">
              <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.start}
            </div>
          )}
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {endLabel}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              disabled={disabled}
              min={dateRange.startDate || minDate}
              max={maxDate}
              className={`
                w-full px-3 py-2 pr-10 border rounded-md transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                ${errors.end 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 hover:border-gray-400'
                }
                ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'}
              `}
            />
            <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {errors.end && (
            <div className="mt-1 text-sm text-red-600 flex items-center">
              <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.end}
            </div>
          )}
        </div>
      </div>

      {/* Date Range Summary */}
      {hasValidRange && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-blue-800">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <span className="font-medium">Periode Pelaksanaan:</span>
            </div>
            {duration && (
              <div className="text-sm font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                {duration} hari
              </div>
            )}
          </div>
          <div className="mt-2 text-sm text-blue-700">
            <div className="flex items-center">
              <span className="font-medium">{formatDateForDisplay(dateRange.startDate)}</span>
              <ArrowRightIcon className="h-4 w-4 mx-2 text-blue-500" />
              <span className="font-medium">{formatDateForDisplay(dateRange.endDate)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Global Error */}
      {error && (
        <div className="mt-2 text-sm text-red-600 flex items-center">
          <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}