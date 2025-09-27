import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual variant untuk semantic meaning */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Badge dengan border atau filled */
  outline?: boolean;
}

/**
 * Badge Atom Component
 * 
 * Consistent badge component untuk status indicators
 * Part dari Atomic Design System
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', outline = false, children, ...props }, ref) => {
    
    // Base styles
    const baseStyles = [
      'inline-flex',
      'items-center',
      'justify-center',
      'font-medium',
      'rounded-full',
      'transition-colors',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-1'
    ].join(' ');

    // Size styles
    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-sm',
      lg: 'px-3 py-1 text-sm'
    };

    // Variant styles
    const variantStyles = {
      default: outline 
        ? 'border border-gray-300 text-gray-700 bg-transparent'
        : 'bg-gray-100 text-gray-800',
      
      success: outline
        ? 'border border-green-300 text-green-700 bg-transparent'
        : 'bg-green-100 text-green-800',
      
      warning: outline
        ? 'border border-yellow-300 text-yellow-700 bg-transparent'
        : 'bg-yellow-100 text-yellow-800',
      
      error: outline
        ? 'border border-red-300 text-red-700 bg-transparent'
        : 'bg-red-100 text-red-800',
      
      info: outline
        ? 'border border-blue-300 text-blue-700 bg-transparent'
        : 'bg-blue-100 text-blue-800',
      
      neutral: outline
        ? 'border border-slate-300 text-slate-700 bg-transparent'
        : 'bg-slate-100 text-slate-800'
    };

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";