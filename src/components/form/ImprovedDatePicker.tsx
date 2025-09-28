'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface ImprovedDatePickerProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  minDate?: string;
  maxDate?: string;
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * Improved DatePicker component with better error handling and user experience
 */
export default function ImprovedDatePicker({
  id,
  name,
  value = '',
  onChange,
  placeholder = 'Pilih tanggal',
  required = false,
  disabled = false,
  className = '',
  autoFocus = false,
  minDate,
  maxDate,
  label,
  error,
  helperText
}: ImprovedDatePickerProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal value with external value
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

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
      console.warn('Date formatting error:', error);
      return '';
    }
  }, []);

  // Validate date
  const validateDate = useCallback((dateStr: string): boolean => {
    if (!dateStr) return !required;
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      
      // Check min date
      if (minDate) {
        const minDateObj = new Date(minDate);
        if (date < minDateObj) return false;
      }
      
      // Check max date
      if (maxDate) {
        const maxDateObj = new Date(maxDate);
        if (date > maxDateObj) return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }, [minDate, maxDate, required]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    
    const isValid = validateDate(newValue);
    setHasError(!isValid);
    
    if (onChange) {
      onChange(newValue);
    }
  }, [onChange, validateDate]);

  // Handle clear button
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setInternalValue('');
    setHasError(false);
    
    if (onChange) {
      onChange('');
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onChange]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const hasValue = internalValue && internalValue.length > 0;
  const showError = error || (hasError && hasValue);
  const displayValue = formatDateForDisplay(internalValue);

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Native Date Input */}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="date"
          value={internalValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          min={minDate}
          max={maxDate}
          className={`
            w-full px-3 py-2 pr-12 border rounded-md transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${showError 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : isFocused 
                ? 'border-blue-300' 
                : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-900'}
            ${hasValue ? 'text-gray-900' : 'text-gray-500'}
          `}
        />

        {/* Calendar Icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <CalendarIcon className={`h-4 w-4 ${showError ? 'text-red-400' : 'text-gray-400'}`} />
        </div>

        {/* Clear Button */}
        {hasValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-8 flex items-center pr-1 hover:bg-gray-100 rounded-r-md transition-colors"
            tabIndex={-1}
          >
            <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Display Value */}
      {displayValue && (
        <div className="mt-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md border">
          <span className="font-medium">Tanggal terpilih:</span> {displayValue}
        </div>
      )}

      {/* Error Message */}
      {showError && (
        <div className="mt-1 text-sm text-red-600 flex items-center">
          <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error || 'Tanggal tidak valid'}
        </div>
      )}

      {/* Helper Text */}
      {helperText && !showError && (
        <div className="mt-1 text-sm text-gray-500">
          {helperText}
        </div>
      )}
    </div>
  );
}