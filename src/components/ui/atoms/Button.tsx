/**
 * Enhanced Button Component - Atom Level
 * 
 * This button component implements the strict contract defined in the architectural report.
 * It follows Atomic Design principles and provides consistent visual hierarchy
 * across all admin, vendor, and verifier interfaces.
 * 
 * Features:
 * - Type-safe variant system (primary, secondary, info, destructive)
 * - Consistent sizing with proper spacing
 * - Loading state management with built-in spinner
 * - Accessibility compliance (ARIA attributes)
 * - Tailwind class conflict resolution via cn()
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant defining color palette and semantic meaning */
  variant?: 'primary' | 'secondary' | 'info' | 'destructive' | 'ghost' | 'outline';
  
  /** Size controlling dimensions and typography scale */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  
  /** Loading state - automatically disables button and shows spinner */
  isLoading?: boolean;
  
  /** Icon to display before the text content */
  leftIcon?: React.ReactNode;
  
  /** Icon to display after the text content */
  rightIcon?: React.ReactNode;
  
  /** Make button full width */
  fullWidth?: boolean;
  
  /** Additional CSS classes (will be merged safely with defaults) */
  className?: string;
}

/**
 * Internal loading spinner component
 */
const LoadingSpinner: React.FC<{ size: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  return (
    <svg 
      className={cn('animate-spin', sizeClasses[size])} 
      fill="none" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

/**
 * Button component following Atomic Design principles
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    className,
    type = 'button',
    ...props
  }, ref) => {
    
    // Base styles - consistent foundation
    const baseStyles = [
      'inline-flex',
      'items-center',
      'justify-center',
      'font-medium',
      'rounded-lg',
      'transition-all',
      'duration-200',
      'ease-in-out',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
      'active:scale-95'
    ].join(' ');

    // Variant styles - semantic color system
    const variantStyles = {
      primary: [
        'bg-blue-600',
        'text-white',
        'hover:bg-blue-700',
        'focus:ring-blue-500',
        'shadow-sm',
        'hover:shadow-md'
      ].join(' '),
      
      secondary: [
        'bg-gray-100',
        'text-gray-900',
        'hover:bg-gray-200',
        'focus:ring-gray-500',
        'border',
        'border-gray-300'
      ].join(' '),
      
      info: [
        'bg-cyan-600',
        'text-white', 
        'hover:bg-cyan-700',
        'focus:ring-cyan-500',
        'shadow-sm',
        'hover:shadow-md'
      ].join(' '),
      
      destructive: [
        'bg-red-600',
        'text-white',
        'hover:bg-red-700',
        'focus:ring-red-500',
        'shadow-sm',
        'hover:shadow-md'
      ].join(' '),
      
      ghost: [
        'bg-transparent',
        'text-gray-700',
        'hover:bg-gray-100',
        'focus:ring-gray-500'
      ].join(' '),
      
      outline: [
        'bg-transparent',
        'text-blue-600',
        'border',
        'border-blue-600',
        'hover:bg-blue-50',
        'focus:ring-blue-500'
      ].join(' ')
    };

    // Size styles - consistent spacing and typography
    const sizeStyles = {
      sm: [
        'px-3',
        'py-1.5',
        'text-xs',
        'gap-1.5'
      ].join(' '),
      
      md: [
        'px-4',
        'py-2',
        'text-sm',
        'gap-2'
      ].join(' '),
      
      lg: [
        'px-6',
        'py-3',
        'text-base',
        'gap-2.5'
      ].join(' '),
      
      xl: [
        'px-8',
        'py-4',
        'text-lg',
        'gap-3'
      ].join(' ')
    };

    // Width styles
    const widthStyles = fullWidth ? 'w-full' : '';

    // Combine all styles using cn() for safe class merging
    const buttonClasses = cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      widthStyles,
      className
    );

    // Determine if button should be disabled
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        {...props}
      >
        {/* Left icon or loading spinner */}
        {isLoading ? (
          <LoadingSpinner size={size} />
        ) : leftIcon ? (
          <span className="flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}

        {/* Button content */}
        {children && (
          <span className={cn(isLoading && 'opacity-70')}>
            {children}
          </span>
        )}

        {/* Right icon (not shown during loading) */}
        {!isLoading && rightIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;