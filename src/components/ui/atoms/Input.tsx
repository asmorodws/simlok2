/**
 * Enhanced Input Component - Atom Level
 * 
 * This input component implements enterprise-grade form controls following
 * the architectural specifications. It provides consistent UX patterns
 * across all user interfaces (admin, vendor, verifier).
 * 
 * Features:
 * - Type-safe variant system for semantic meaning
 * - Comprehensive validation state management
 * - Built-in error and helper text display
 * - Icon support for enhanced UX
 * - Accessibility compliance (ARIA, labels)
 * - Forward ref for form library compatibility
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visual variant for different contexts */
  variant?: 'default' | 'search' | 'password' | 'email';
  
  /** Size controlling dimensions and typography */
  size?: 'sm' | 'md' | 'lg';
  
  /** Validation state with semantic meaning */
  state?: 'default' | 'success' | 'warning' | 'error';
  
  /** Label text for accessibility and UX */
  label?: string;
  
  /** Helper text shown below input */
  helperText?: string;
  
  /** Error message (automatically sets state to error) */
  errorMessage?: string;
  
  /** Icon displayed at the start of input */
  startIcon?: React.ReactNode;
  
  /** Icon displayed at the end of input */
  endIcon?: React.ReactNode;
  
  /** Make input full width */
  fullWidth?: boolean;
  
  /** Loading state indicator */
  isLoading?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Container CSS classes */
  containerClassName?: string;
}

/**
 * Loading spinner for input fields
 */
const InputSpinner: React.FC = () => (
  <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
);

/**
 * Input component following Atomic Design principles
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    variant = 'default',
    size = 'md', 
    state = 'default',
    label,
    helperText,
    errorMessage,
    startIcon,
    endIcon,
    fullWidth = false,
    isLoading = false,
    className,
    containerClassName,
    id,
    disabled,
    ...props
  }, ref) => {

    // Auto-set error state if errorMessage is provided
    const actualState = errorMessage ? 'error' : state;
    const actualHelperText = errorMessage || helperText;

    // Generate unique ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const helperTextId = actualHelperText ? `${inputId}-helper` : undefined;

    // Base input styles
    const baseInputStyles = [
      'block',
      'border',
      'rounded-lg',
      'transition-all',
      'duration-200',
      'ease-in-out',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-1',
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
      'disabled:bg-gray-50',
      'placeholder:text-gray-400'
    ].join(' ');

    // Size-specific styles
    const sizeStyles = {
      sm: {
        input: 'px-3 py-1.5 text-sm',
        icon: 'w-4 h-4',
        iconPadding: startIcon ? 'pl-9' : endIcon || isLoading ? 'pr-9' : ''
      },
      md: {
        input: 'px-4 py-2.5 text-sm',
        icon: 'w-5 h-5', 
        iconPadding: startIcon ? 'pl-11' : endIcon || isLoading ? 'pr-11' : ''
      },
      lg: {
        input: 'px-5 py-3 text-base',
        icon: 'w-6 h-6',
        iconPadding: startIcon ? 'pl-12' : endIcon || isLoading ? 'pr-12' : ''
      }
    };

    // State-specific styles
    const stateStyles = {
      default: [
        'border-gray-300',
        'bg-white',
        'text-gray-900',
        'focus:ring-blue-500',
        'focus:border-blue-500',
        'hover:border-gray-400'
      ].join(' '),
      
      success: [
        'border-green-500',
        'bg-white',
        'text-gray-900', 
        'focus:ring-green-500',
        'focus:border-green-500'
      ].join(' '),
      
      warning: [
        'border-yellow-500',
        'bg-white',
        'text-gray-900',
        'focus:ring-yellow-500', 
        'focus:border-yellow-500'
      ].join(' '),
      
      error: [
        'border-red-500',
        'bg-white',
        'text-gray-900',
        'focus:ring-red-500',
        'focus:border-red-500'
      ].join(' ')
    };

    // Icon positioning styles
    const iconPositionStyles = {
      start: {
        sm: 'left-3',
        md: 'left-4',
        lg: 'left-5'
      },
      end: {
        sm: 'right-3', 
        md: 'right-4',
        lg: 'right-5'
      }
    };

    // Combine input styles
    const inputStyles = cn(
      baseInputStyles,
      sizeStyles[size].input,
      sizeStyles[size].iconPadding,
      stateStyles[actualState],
      fullWidth ? 'w-full' : '',
      className
    );

    // Container styles
    const containerStyles = cn(
      'relative',
      fullWidth ? 'w-full' : '',
      containerClassName
    );

    // Label styles
    const labelStyles = cn(
      'block',
      'text-sm',
      'font-medium',
      'mb-2',
      actualState === 'error' ? 'text-red-700' : 'text-gray-700'
    );

    // Helper text styles
    const helperTextStyles = cn(
      'mt-2',
      'text-xs',
      {
        'text-gray-600': actualState === 'default',
        'text-green-600': actualState === 'success', 
        'text-yellow-600': actualState === 'warning',
        'text-red-600': actualState === 'error'
      }
    );

    // Icon styles
    const iconStyles = cn(
      'absolute',
      'top-1/2',
      'transform',
      '-translate-y-1/2',
      'pointer-events-none',
      'text-gray-400',
      sizeStyles[size].icon
    );

    return (
      <div className={containerStyles}>
        {/* Label */}
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}

        {/* Input container with icons */}
        <div className="relative">
          {/* Start icon */}
          {startIcon && (
            <div className={cn(iconStyles, iconPositionStyles.start[size])}>
              {startIcon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            className={inputStyles}
            disabled={disabled || isLoading}
            aria-invalid={actualState === 'error'}
            aria-describedby={helperTextId}
            {...props}
          />

          {/* End icon or loading spinner */}
          {(endIcon || isLoading) && (
            <div className={cn(iconStyles, iconPositionStyles.end[size])}>
              {isLoading ? <InputSpinner /> : endIcon}
            </div>
          )}
        </div>

        {/* Helper text or error message */}
        {actualHelperText && (
          <p id={helperTextId} className={helperTextStyles}>
            {actualHelperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;