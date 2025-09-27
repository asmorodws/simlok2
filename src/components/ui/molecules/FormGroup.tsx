/**
 * FormGroup Molecule Component
 * 
 * Combines Input atom with consistent labeling, validation messaging,
 * and error state management. This molecule provides the standard
 * form field pattern used across all admin, vendor, and verifier interfaces.
 * 
 * Features:
 * - Consistent label and input pairing
 * - Integrated validation display
 * - Required field indication
 * - Accessible markup and ARIA relationships
 * - Support for different input types and variants
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Input, InputProps } from '../atoms/Input';
import { Icon } from '../atoms/Icon';

export interface FormGroupProps extends Omit<InputProps, 'label' | 'errorMessage' | 'helperText'> {
  /** Field label text */
  label: string;
  
  /** Whether the field is required */
  required?: boolean;
  
  /** Helper text shown below input */
  helperText?: string;
  
  /** Error message (overrides helperText when present) */
  errorMessage?: string;
  
  /** Additional context or validation info */
  description?: string;
  
  /** Custom label styling */
  labelClassName?: string;
  
  /** Container styling */
  containerClassName?: string;
}

/**
 * FormGroup molecule that combines label, input, and validation messaging
 */
export const FormGroup: React.FC<FormGroupProps> = ({
  label,
  required = false,
  helperText,
  errorMessage,
  description,
  labelClassName,
  containerClassName,
  id,
  ...inputProps
}) => {
  
  // Generate unique IDs for accessibility
  const fieldId = id || `formgroup-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const helperTextId = (helperText || errorMessage) ? `${fieldId}-helper` : undefined;

  // Determine validation state based on error presence
  const validationState = errorMessage ? 'error' : inputProps.state || 'default';

  // Label styles with required indicator
  const labelStyles = cn(
    'block',
    'text-sm',
    'font-medium',
    'mb-1.5',
    {
      'text-gray-700': validationState === 'default',
      'text-red-700': validationState === 'error',
      'text-green-700': validationState === 'success',
      'text-yellow-700': validationState === 'warning'
    },
    labelClassName
  );

  // Required indicator styles
  const requiredStyles = cn(
    'ml-1',
    'text-red-500',
    'font-medium'
  );

  // Description styles
  const descriptionStyles = cn(
    'text-xs',
    'text-gray-600',
    'mb-2',
    'leading-relaxed'
  );

  // Helper text styles
  const helperTextStyles = cn(
    'mt-1.5',
    'text-xs',
    'flex',
    'items-center',
    'gap-1.5',
    {
      'text-gray-600': validationState === 'default',
      'text-red-600': validationState === 'error',
      'text-green-600': validationState === 'success',
      'text-yellow-600': validationState === 'warning'
    }
  );

  // Container styles
  const containerStyles = cn(
    'space-y-1',
    containerClassName
  );

  return (
    <div className={containerStyles}>
      {/* Label with required indicator */}
      <label htmlFor={fieldId} className={labelStyles}>
        {label}
        {required && (
          <span className={requiredStyles} aria-label="required">
            *
          </span>
        )}
      </label>

      {/* Optional description */}
      {description && (
        <p id={descriptionId} className={descriptionStyles}>
          {description}
        </p>
      )}

      {/* Input field */}
      <Input
        id={fieldId}
        state={validationState}
        required={required}
        aria-describedby={cn(
          descriptionId && descriptionId,
          helperTextId && helperTextId
        ).trim() || undefined}
        aria-invalid={validationState === 'error'}
        {...inputProps}
      />

      {/* Helper text or error message */}
      {(helperText || errorMessage) && (
        <p id={helperTextId} className={helperTextStyles}>
          {validationState === 'error' && (
            <Icon 
              name="alert-circle" 
              size="xs" 
              variant="error"
              decorative
            />
          )}
          {validationState === 'success' && (
            <Icon 
              name="check-circle" 
              size="xs" 
              variant="success"
              decorative
            />
          )}
          {validationState === 'warning' && (
            <Icon 
              name="alert-triangle" 
              size="xs" 
              variant="warning"
              decorative
            />
          )}
          <span>{errorMessage || helperText}</span>
        </p>
      )}
    </div>
  );
};

export default FormGroup;