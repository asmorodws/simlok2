/**
 * Alert Molecule Component
 * 
 * Provides consistent status and notification messaging across the application.
 * This molecule combines Icon atoms with structured content to create
 * semantic status displays.
 * 
 * Features:
 * - Semantic variants (success, warning, error, info)
 * - Icon integration with proper styling
 * - Optional action links
 * - Consistent spacing and typography
 * - Accessibility compliance
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Icon, StatusIcon } from '../atoms/Icon';

export interface AlertProps {
  /** Alert variant determining color and icon */
  variant: 'success' | 'warning' | 'error' | 'info';
  
  /** Alert title */
  title: string;
  
  /** Alert message content */
  message: string;
  
  /** Optional action link */
  link?: {
    href: string;
    text: string;
  };
  
  /** Additional CSS classes */
  className?: string;
  
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  
  /** Dismiss handler */
  onDismiss?: () => void;
}

/**
 * Alert molecule component
 */
export const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  message,
  link,
  className,
  dismissible = false,
  onDismiss
}) => {

  // Variant-specific styling
  const variantStyles = {
    success: {
      container: 'bg-green-50 border-green-200 text-green-800',
      title: 'text-green-900',
      message: 'text-green-700'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      title: 'text-yellow-900', 
      message: 'text-yellow-700'
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      title: 'text-red-900',
      message: 'text-red-700'
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      title: 'text-blue-900',
      message: 'text-blue-700'
    }
  };

  // Base container styles
  const containerStyles = cn(
    'rounded-lg border p-4',
    variantStyles[variant].container,
    className
  );

  return (
    <div className={containerStyles} role="alert">
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0">
          <StatusIcon 
            status={variant === 'error' ? 'error' : variant === 'warning' ? 'warning' : variant === 'success' ? 'success' : 'info'}
            size="sm"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={cn('text-sm font-semibold mb-1', variantStyles[variant].title)}>
            {title}
          </h4>
          
          <p className={cn('text-sm', variantStyles[variant].message)}>
            {message}
          </p>

          {/* Optional Action Link */}
          {link && (
            <div className="mt-3">
              <Link
                href={link.href}
                className={cn(
                  'inline-flex items-center gap-1 text-sm font-medium underline',
                  variantStyles[variant].title,
                  'hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                )}
              >
                {link.text}
                <Icon name="arrow-right" size="xs" />
              </Link>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {dismissible && onDismiss && (
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={onDismiss}
              className={cn(
                'inline-flex items-center justify-center w-6 h-6 rounded-md',
                'hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                variantStyles[variant].title
              )}
              aria-label="Dismiss alert"
            >
              <Icon name="x" size="xs" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Specialized Alert variants for common use cases
 */

// Success alert for completed actions
export const SuccessAlert: React.FC<Omit<AlertProps, 'variant'>> = (props) => (
  <Alert variant="success" {...props} />
);

// Error alert for failures and validation errors  
export const ErrorAlert: React.FC<Omit<AlertProps, 'variant'>> = (props) => (
  <Alert variant="error" {...props} />
);

// Warning alert for important notices
export const WarningAlert: React.FC<Omit<AlertProps, 'variant'>> = (props) => (
  <Alert variant="warning" {...props} />
);

// Info alert for general information
export const InfoAlert: React.FC<Omit<AlertProps, 'variant'>> = (props) => (
  <Alert variant="info" {...props} />
);

export default Alert;