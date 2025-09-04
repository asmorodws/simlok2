import { type VariantProps, cva } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';
import { Button } from './Button';

/**
 * Form field variants
 */
const formFieldVariants = cva('space-y-2', {
  variants: {
    orientation: {
      vertical: 'flex flex-col',
      horizontal: 'flex flex-row items-center gap-4',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
});

export interface FormFieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formFieldVariants> {
  /**
   * Field label
   */
  label?: string;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Error message
   */
  error?: string;
  /**
   * Helper text
   */
  helperText?: string;
  /**
   * Field description
   */
  description?: string;
}

/**
 * Form field wrapper component
 */
const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      children,
      label,
      required,
      error,
      helperText,
      description,
      orientation,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(formFieldVariants({ orientation }), className)}
        {...props}
      >
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        
        <div className="space-y-1">
          {children}
          
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
          
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          
          {helperText && !error && (
            <p className="text-sm text-gray-500">{helperText}</p>
          )}
        </div>
      </div>
    );
  }
);

FormField.displayName = 'FormField';

/**
 * Form group for organizing related fields
 */
const FormGroup = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title?: string;
    description?: string;
  }
>(({ children, title, description, className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('space-y-6', className)} {...props}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}
      
      <div className="space-y-4">{children}</div>
    </div>
  );
});

FormGroup.displayName = 'FormGroup';

/**
 * Form component with built-in validation display
 */
export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /**
   * Form title
   */
  title?: string;
  /**
   * Form description
   */
  description?: string;
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Submit button text
   */
  submitText?: string;
  /**
   * Cancel button text
   */
  cancelText?: string;
  /**
   * Cancel handler
   */
  onCancel?: () => void;
  /**
   * Whether to show submit button
   */
  showSubmit?: boolean;
  /**
   * Whether to show cancel button
   */
  showCancel?: boolean;
  /**
   * Custom footer content
   */
  footer?: React.ReactNode;
}

/**
 * Main Form component with header and footer
 * 
 * @example
 * ```tsx
 * <Form
 *   title="User Registration"
 *   description="Create a new user account"
 *   onSubmit={handleSubmit}
 *   loading={isSubmitting}
 *   submitText="Create Account"
 *   showCancel
 *   onCancel={() => router.back()}
 * >
 *   <FormGroup title="Personal Information">
 *     <FormField label="Full Name" required error={errors.name}>
 *       <Input
 *         {...register('name')}
 *         placeholder="Enter your full name"
 *       />
 *     </FormField>
 *     
 *     <FormField label="Email" required error={errors.email}>
 *       <Input
 *         type="email"
 *         {...register('email')}
 *         placeholder="Enter your email"
 *       />
 *     </FormField>
 *   </FormGroup>
 * </Form>
 * ```
 */
const Form = forwardRef<HTMLFormElement, FormProps>(
  (
    {
      children,
      title,
      description,
      loading = false,
      submitText = 'Submit',
      cancelText = 'Cancel',
      onCancel,
      showSubmit = true,
      showCancel = false,
      footer,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <form
        ref={ref}
        className={cn('space-y-6', className)}
        {...props}
      >
        {/* Header */}
        {(title || description) && (
          <div className="space-y-2">
            {title && (
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-gray-600">{description}</p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">{children}</div>

        {/* Footer */}
        {(footer || showSubmit || showCancel) && (
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            {footer || (
              <>
                {showCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                  >
                    {cancelText}
                  </Button>
                )}
                
                {showSubmit && (
                  <Button
                    type="submit"
                    loading={loading}
                    disabled={loading}
                  >
                    {submitText}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </form>
    );
  }
);

Form.displayName = 'Form';

/**
 * Simple form row for horizontal layouts
 */
const FormRow = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    columns?: 1 | 2 | 3 | 4;
  }
>(({ children, columns = 2, className, ...props }, ref) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div
      ref={ref}
      className={cn('grid gap-4', gridCols[columns], className)}
      {...props}
    >
      {children}
    </div>
  );
});

FormRow.displayName = 'FormRow';

export { Form, FormField, FormGroup, FormRow, formFieldVariants };
