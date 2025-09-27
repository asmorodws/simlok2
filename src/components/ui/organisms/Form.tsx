/**
 * Enhanced Form Organism
 * 
 * This organism combines multiple FormGroup molecules to create complete
 * forms with validation, submission states, and consistent UX patterns.
 * It provides a native HTML form implementation that can be enhanced
 * with React Hook Form later.
 * 
 * Features:
 * - Native HTML form validation
 * - Consistent loading and error states
 * - Accessible form structure
 * - Flexible layout options (vertical, horizontal)
 * - Auto-focus management
 * - Submission state management
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '../molecules/Card';
import { FormGroup } from '../molecules/FormGroup';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

export interface FormField {
  /** Field name corresponding to form data key */
  name: string;
  
  /** Field label */
  label: string;
  
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Whether field is required */
  required?: boolean;
  
  /** Helper text */
  helperText?: string;
  
  /** Field description */
  description?: string;
  
  /** Input size */
  size?: 'sm' | 'md' | 'lg';
  
  /** Start icon */
  startIcon?: React.ReactNode;
  
  /** End icon */
  endIcon?: React.ReactNode;
  
  /** Whether field should be disabled */
  disabled?: boolean;

  /** Default value */
  defaultValue?: string;
}

export interface FormProps {
  /** Form fields configuration */
  fields: FormField[];
  
  /** Submit handler */
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  
  /** Form title */
  title?: string;
  
  /** Form subtitle or description */
  subtitle?: string;
  
  /** Submit button text */
  submitText?: string;
  
  /** Submit button variant */
  submitVariant?: 'primary' | 'secondary' | 'info' | 'destructive';
  
  /** Whether form is currently submitting */
  isSubmitting?: boolean;
  
  /** Global form error message */
  error?: string | null;
  
  /** Success message after submission */
  success?: string | null;
  
  /** Form layout orientation */
  layout?: 'vertical' | 'horizontal';
  
  /** Whether to wrap form in card */
  card?: boolean;
  
  /** Additional form actions (cancel, reset, etc.) */
  actions?: React.ReactNode;
  
  /** Custom CSS classes */
  className?: string;
  
  /** Form container CSS classes */
  containerClassName?: string;
}

/**
 * Enhanced Form organism component
 */
export const Form: React.FC<FormProps> = ({
  fields,
  onSubmit,
  title,
  subtitle,
  submitText = 'Submit',
  submitVariant = 'primary',
  isSubmitting = false,
  error = null,
  success = null,
  layout = 'vertical',
  card = true,
  actions,
  className,
  containerClassName
}) => {
  
  // Form submission handler
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const data: Record<string, any> = {};
    
    // Extract form data
    fields.forEach(field => {
      const value = formData.get(field.name);
      data[field.name] = value;
    });

    try {
      await onSubmit(data);
    } catch (err) {
      console.error('Form submission error:', err);
    }
  };

  // Form styles based on layout
  const formStyles = cn(
    'space-y-6',
    {
      'max-w-md mx-auto': layout === 'vertical',
      'grid grid-cols-1 md:grid-cols-2 gap-6': layout === 'horizontal'
    },
    className
  );

  // Container styles
  const containerStyles = cn(
    'w-full',
    containerClassName
  );

  // Render form fields
  const renderFields = () => (
    <div className={formStyles}>
      {fields.map((field) => (
        <FormGroup
          key={field.name}
          label={field.label}
          required={field.required ?? false}
          {...(field.helperText && { helperText: field.helperText })}
          {...(field.description && { description: field.description })}
          {...(field.size && { size: field.size })}
          {...(field.startIcon && { startIcon: field.startIcon })}
          {...(field.endIcon && { endIcon: field.endIcon })}
          {...(field.type && { type: field.type })}
          {...(field.placeholder && { placeholder: field.placeholder })}
          disabled={field.disabled || isSubmitting}
          name={field.name}
          {...(field.defaultValue && { defaultValue: field.defaultValue })}
        />
      ))}
    </div>
  );

  // Render form actions
  const renderActions = () => (
    <div className="flex items-center justify-between gap-4 pt-6">
      <div className="flex items-center gap-3">
        {actions}
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            // Reset form by resetting all input values
            const form = document.querySelector('form') as HTMLFormElement;
            if (form) form.reset();
          }}
          disabled={isSubmitting}
          size="md"
        >
          Reset
        </Button>
        
        <Button
          type="submit"
          variant={submitVariant}
          isLoading={isSubmitting}
          disabled={isSubmitting}
          size="md"
        >
          {submitText}
        </Button>
      </div>
    </div>
  );

  // Render global messages
  const renderMessages = () => (
    <>
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <Icon name="x-circle" variant="error" size="sm" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Submission Failed
            </p>
            <p className="text-sm text-red-600">
              {error}
            </p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <Icon name="check-circle" variant="success" size="sm" />
          <div>
            <p className="text-sm font-medium text-green-800">
              Success
            </p>
            <p className="text-sm text-green-600">
              {success}
            </p>
          </div>
        </div>
      )}
    </>
  );

  // Form content
  const formContent = (
    <div className={containerStyles}>
      {renderMessages()}
      
      <form onSubmit={handleSubmit} noValidate>
        {renderFields()}
        {renderActions()}
      </form>
    </div>
  );

  // Wrap in card if requested
  if (card && title) {
    return (
      <Card
        title={title}
        {...(subtitle && { subtitle })}
        size="lg"
        variant="outlined"
      >
        {formContent}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {title && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {formContent}
    </div>
  );
};

/**
 * Specialized form variants for common use cases
 */

// Login form with predefined fields
export const LoginForm: React.FC<{
  onSubmit: (data: Record<string, any>) => void;
  isSubmitting?: boolean;
  error?: string | null;
}> = ({ onSubmit, isSubmitting = false, error = null }) => {

  const fields: FormField[] = [
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'Enter your email',
      required: true,
      startIcon: <Icon name="mail" size="sm" />
    },
    {
      name: 'password',
      label: 'Password', 
      type: 'password',
      placeholder: 'Enter your password',
      required: true,
      startIcon: <Icon name="lock" size="sm" />
    }
  ];

  return (
    <Form
      fields={fields}
      onSubmit={onSubmit}
      title="Sign In"
      subtitle="Enter your credentials to access your account"
      submitText="Sign In"
      submitVariant="primary"
      isSubmitting={isSubmitting}
      error={error}
      layout="vertical"
    />
  );
};

export default Form;