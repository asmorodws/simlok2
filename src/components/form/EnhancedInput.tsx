'use client';

import { useState, useEffect } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { InputValidator, ValidationResult } from '@/utils/input-validation';

interface EnhancedInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  validationType: 'name' | 'phone' | 'address' | 'email' | 'vendor' | 'job' | 'document' | 'number' | 'text';
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  fieldName?: string; // For custom field names in validation
  min?: number; // For number validation
  max?: number; // For number validation
  documentType?: string; // For document number validation
  autoValidate?: boolean; // Auto validate on blur
  showValidationIcon?: boolean; // Show validation status icon
}

export default function EnhancedInput({
  id,
  name,
  value,
  onChange,
  validationType,
  label,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  helperText,
  fieldName,
  min,
  max,
  documentType,
  autoValidate = true,
  showValidationIcon = true
}: EnhancedInputProps) {
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [touched, setTouched] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  // Validate input based on type
  const validateInput = (inputValue: string): ValidationResult => {
    if (!inputValue && !required) {
      return { isValid: true };
    }

    switch (validationType) {
      case 'name':
        return InputValidator.validateName(inputValue, fieldName || label);
      case 'phone':
        return InputValidator.validatePhoneNumber(inputValue);
      case 'address':
        return InputValidator.validateAddress(inputValue);
      case 'email':
        return InputValidator.validateEmail(inputValue);
      case 'vendor':
        return InputValidator.validateVendorName(inputValue);
      case 'job':
        return InputValidator.validateJobDescription(inputValue);
      case 'document':
        return InputValidator.validateDocumentNumber(inputValue, documentType);
      case 'number':
        return InputValidator.validateNumber(inputValue, min, max, fieldName || label);
      case 'text':
      default:
        // Basic text validation
        if (required && !inputValue.trim()) {
          return { isValid: false, error: `${fieldName || label} wajib diisi` };
        }
        return { isValid: true, sanitizedValue: inputValue.trim() };
    }
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);

    // Real-time validation for specific types
    if (autoValidate && touched) {
      const validationResult = validateInput(newValue);
      setValidation(validationResult);
    }

    // Always call onChange to update parent state
    onChange(newValue);
  };

  // Handle blur (validate and sanitize)
  const handleBlur = () => {
    setTouched(true);
    
    if (autoValidate) {
      const validationResult = validateInput(displayValue);
      setValidation(validationResult);

      // Use sanitized value if available
      if (validationResult.isValid && validationResult.sanitizedValue) {
        const sanitizedValue = validationResult.sanitizedValue;
        setDisplayValue(sanitizedValue);
        onChange(sanitizedValue);
      }
    }
  };

  // Handle focus
  const handleFocus = () => {
    if (!touched) {
      setTouched(true);
    }
  };

  // Get input type based on validation type
  const getInputType = (): string => {
    switch (validationType) {
      case 'email':
        return 'email';
      case 'phone':
        return 'tel';
      case 'number':
        return 'number';
      default:
        return 'text';
    }
  };

  // Get input mode for mobile optimization
  const getInputMode = (): "search" | "text" | "email" | "tel" | "url" | "numeric" | "none" | "decimal" | undefined => {
    switch (validationType) {
      case 'phone':
        return 'tel';
      case 'number':
        return 'numeric';
      case 'email':
        return 'email';
      default:
        return 'text';
    }
  };

  // Get additional input props for numbers
  const getNumberProps = () => {
    if (validationType === 'number') {
      return {
        min: min,
        max: max,
        step: Number.isInteger(min) && Number.isInteger(max) ? 1 : 'any'
      };
    }
    return {};
  };

  const hasError = touched && !validation.isValid;
  const hasSuccess = touched && validation.isValid && displayValue.length > 0;

  return (
    <div className={`w-full ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          id={id}
          name={name}
          type={getInputType()}
          inputMode={getInputMode()}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
            focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors
            ${hasError 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : hasSuccess
                ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
            ${showValidationIcon && (hasError || hasSuccess) ? 'pr-10' : ''}
          `}
          {...getNumberProps()}
        />
        
        {/* Validation Icon */}
        {showValidationIcon && (hasError || hasSuccess) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {hasError ? (
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
            ) : (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            )}
          </div>
        )}
      </div>

      {/* Helper Text or Error Message */}
      {hasError && validation.error ? (
        <p className="mt-1 text-sm text-red-600">{validation.error}</p>
      ) : helperText && !hasError ? (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      ) : hasSuccess && validationType !== 'text' ? (
        <p className="mt-1 text-sm text-green-600">
          {getSuccessMessage()}
        </p>
      ) : null}
    </div>
  );

  function getSuccessMessage(): string {
    switch (validationType) {
      case 'name':
        return 'Nama valid';
      case 'phone':
        return 'Nomor telepon valid';
      case 'email':
        return 'Email valid';
      case 'address':
        return 'Alamat valid';
      case 'vendor':
        return 'Nama vendor valid';
      case 'job':
        return 'Deskripsi pekerjaan valid';
      case 'document':
        return 'Nomor dokumen valid';
      case 'number':
        return 'Angka valid';
      default:
        return 'Input valid';
    }
  }
}