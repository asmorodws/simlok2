import { type VariantProps, cva } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Button component variants using CVA (Class Variance Authority)
 */
const buttonVariants = cva(
  // Base classes that apply to all variants
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Custom variants for this project
        success: 'bg-green-600 text-white shadow hover:bg-green-700',
        warning: 'bg-yellow-600 text-white shadow hover:bg-yellow-700',
        info: 'bg-blue-600 text-white shadow hover:bg-blue-700',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Whether the button is in loading state
   */
  loading?: boolean;
  /**
   * Icon to display before the button text
   */
  icon?: React.ReactNode;
  /**
   * Custom className to override styles
   */
  className?: string;
}

/**
 * Reusable Button component with multiple variants and states
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="lg" loading={isSubmitting}>
 *   Submit Form
 * </Button>
 * 
 * <Button variant="outline" icon={<PlusIcon />}>
 *   Add Item
 * </Button>
 * ```
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Loading...
          </>
        ) : (
          <>
            {icon && <span className="mr-2">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
