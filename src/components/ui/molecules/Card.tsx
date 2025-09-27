/**
 * Card Molecule Component
 * 
 * Provides consistent content containers with optional headers, footers,
 * and interactive states. This molecule establishes the standard layout
 * pattern for information display across all user interfaces.
 * 
 * Features:
 * - Flexible header with title and optional actions
 * - Consistent padding and spacing system
 * - Optional loading and error states
 * - Hover and focus interactions
 * - Responsive design considerations
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '../atoms/Icon';

export interface CardProps {
  /** Card content */
  children: React.ReactNode;
  
  /** Optional card title */
  title?: string;
  
  /** Optional subtitle or description */
  subtitle?: string;
  
  /** Header actions (buttons, icons, etc.) */
  headerActions?: React.ReactNode;
  
  /** Footer content */
  footer?: React.ReactNode;
  
  /** Card visual variant */
  variant?: 'default' | 'outlined' | 'elevated' | 'ghost';
  
  /** Size variant affecting padding */
  size?: 'sm' | 'md' | 'lg';
  
  /** Whether card is interactive (clickable) */
  interactive?: boolean;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Error state with optional message */
  error?: string | null;
  
  /** Click handler for interactive cards */
  onClick?: () => void;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Header CSS classes */
  headerClassName?: string;
  
  /** Content CSS classes */
  contentClassName?: string;
  
  /** Footer CSS classes */
  footerClassName?: string;
}

/**
 * Loading skeleton for card content
 */
const CardSkeleton: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const skeletonSizes = {
    sm: ['h-3', 'h-2', 'h-2'],
    md: ['h-4', 'h-3', 'h-3'],
    lg: ['h-5', 'h-4', 'h-4']
  };

  return (
    <div className="animate-pulse space-y-3">
      {skeletonSizes[size].map((height, index) => (
        <div 
          key={index}
          className={cn('bg-gray-200 rounded', height)}
          style={{ width: `${100 - (index * 10)}%` }}
        />
      ))}
    </div>
  );
};

/**
 * Card molecule component
 */
export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  headerActions,
  footer,
  variant = 'default',
  size = 'md',
  interactive = false,
  isLoading = false,
  error = null,
  onClick,
  className,
  headerClassName,
  contentClassName,
  footerClassName
}) => {

  // Base card styles
  const baseStyles = [
    'bg-white',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'ease-in-out'
  ].join(' ');

  // Variant styles
  const variantStyles = {
    default: 'border border-gray-200',
    outlined: 'border-2 border-gray-300',
    elevated: 'shadow-md hover:shadow-lg border border-gray-100',
    ghost: 'border-0 bg-gray-50'
  };

  // Interactive styles
  const interactiveStyles = interactive ? [
    'cursor-pointer',
    'hover:shadow-md',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-blue-500',
    'focus:ring-offset-2',
    'active:scale-[0.98]'
  ].join(' ') : '';

  // Size-based padding
  const sizeStyles = {
    sm: {
      header: 'px-4 py-3',
      content: 'px-4 pb-4',
      footer: 'px-4 py-3'
    },
    md: {
      header: 'px-6 py-4', 
      content: 'px-6 pb-6',
      footer: 'px-6 py-4'
    },
    lg: {
      header: 'px-8 py-6',
      content: 'px-8 pb-8', 
      footer: 'px-8 py-6'
    }
  };

  // Combine card styles
  const cardStyles = cn(
    baseStyles,
    variantStyles[variant],
    interactiveStyles,
    className
  );

  // Header styles
  const headerStyles = cn(
    'border-b border-gray-100',
    sizeStyles[size].header,
    headerClassName
  );

  // Content styles
  const contentStyles = cn(
    sizeStyles[size].content,
    contentClassName
  );

  // Footer styles
  const footerStyles = cn(
    'border-t border-gray-100',
    sizeStyles[size].footer,
    footerClassName
  );

  // Handle card click
  const handleClick = () => {
    if (interactive && onClick && !isLoading) {
      onClick();
    }
  };

  // Handle keyboard events for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (interactive && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={cardStyles}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      aria-disabled={isLoading}
    >
      {/* Header Section */}
      {(title || subtitle || headerActions) && (
        <div className={headerStyles}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className={cn(
                  'font-semibold text-gray-900 truncate',
                  size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
                )}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className={cn(
                  'text-gray-600 mt-1',
                  size === 'sm' ? 'text-xs' : 'text-sm'
                )}>
                  {subtitle}
                </p>
              )}
            </div>
            
            {headerActions && (
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                {headerActions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className={contentStyles}>
        {error ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <Icon name="alert-circle" variant="error" size="sm" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Something went wrong
              </p>
              <p className="text-sm text-red-600 mt-1">
                {error}
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <CardSkeleton size={size} />
        ) : (
          children
        )}
      </div>

      {/* Footer Section */}
      {footer && !isLoading && !error && (
        <div className={footerStyles}>
          {footer}
        </div>
      )}
    </div>
  );
};

/**
 * Specialized card variants for common use cases
 */

// Stats card for dashboard metrics
export const StatsCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down';
  };
  icon?: React.ReactNode;
} & Omit<CardProps, 'title' | 'children'>> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  ...cardProps
}) => {
  return (
    <Card title={title} variant="elevated" {...cardProps}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-sm mt-2',
              trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            )}>
              <Icon 
                name={trend.direction === 'up' ? 'chevron-up' : 'chevron-down'}
                size="xs"
                variant={trend.direction === 'up' ? 'success' : 'error'}
              />
              <span>{trend.value}% {trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export default Card;