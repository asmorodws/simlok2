import React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Label text */
  label?: string;
  
  /** Description text */
  description?: string;
  
  /** Error state */
  error?: boolean;
  
  /** Error message */
  errorMessage?: string;
}

/**
 * Checkbox Atom Component
 * 
 * Consistent checkbox component dengan label dan error handling
 * Part dari Atomic Design System
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, errorMessage, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-start space-x-3">
        <div className="flex items-center h-5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn(
              // Base styles
              'w-4 h-4 rounded border-gray-300 text-blue-600',
              'focus:ring-blue-500 focus:ring-2 focus:ring-offset-0',
              'transition-colors duration-200',
              // Error styles
              error && 'border-red-300 focus:ring-red-500',
              // Disabled styles
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
        </div>
        
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'block text-sm font-medium cursor-pointer',
                  error ? 'text-red-600' : 'text-gray-700'
                )}
              >
                {label}
              </label>
            )}
            
            {description && (
              <p className="text-xs text-gray-500 mt-1">
                {description}
              </p>
            )}
            
            {error && errorMessage && (
              <p className="text-xs text-red-600 mt-1">
                {errorMessage}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";