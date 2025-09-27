import React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  error?: boolean;
}

/**
 * Label Atom Component
 * 
 * Konsisten label component untuk form elements
 * Part dari Atomic Design System
 */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, error, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          // Base styles
          "text-sm font-medium leading-none",
          // Color variants
          error ? "text-red-600" : "text-gray-700",
          // Disabled state
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
  }
);

Label.displayName = "Label";