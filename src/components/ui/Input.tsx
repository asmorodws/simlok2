import { type VariantProps, cva } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Input component variants
 */
const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
        success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
      },
      size: {
        default: 'h-10',
        sm: 'h-8 text-xs',
        lg: 'h-12 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /**
   * Label for the input
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Helper text to display below input
   */
  helperText?: string;
  /**
   * Icon to display on the left side of input
   */
  leftIcon?: React.ReactNode;
  /**
   * Icon to display on the right side of input
   */
  rightIcon?: React.ReactNode;
  /**
   * Whether the input is required
   */
  required?: boolean;
}

/**
 * Reusable Input component with validation states
 * 
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="Enter your email"
 *   error={errors.email?.message}
 *   required
 * />
 * ```
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      required,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;
    const inputVariant = hasError ? 'error' : variant;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-gray-500">{leftIcon}</span>
            </div>
          )}
          
          <input
            type={type}
            className={cn(
              inputVariants({ variant: inputVariant, size, className }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10'
            )}
            id={inputId}
            ref={ref}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-500">{rightIcon}</span>
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <p className={cn(
            'text-sm',
            hasError ? 'text-red-600' : 'text-gray-500'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
