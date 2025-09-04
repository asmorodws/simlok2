import { type VariantProps, cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Toast component variants
 */
const toastVariants = cva(
  'relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'border-gray-200 bg-white text-gray-900',
        success: 'border-green-200 bg-green-50 text-green-900',
        error: 'border-red-200 bg-red-50 text-red-900',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
        info: 'border-blue-200 bg-blue-50 text-blue-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  /**
   * Toast title
   */
  title?: string;
  /**
   * Toast description/message
   */
  description?: string;
  /**
   * Whether to show close button
   */
  closable?: boolean;
  /**
   * Auto close duration in milliseconds (0 = no auto close)
   */
  duration?: number;
  /**
   * Function to call when toast is closed
   */
  onClose?: () => void;
  /**
   * Custom icon
   */
  icon?: React.ReactNode;
}

/**
 * Individual Toast component
 */
const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      className,
      variant,
      title,
      description,
      children,
      closable = true,
      duration = 5000,
      onClose,
      icon,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
      if (duration > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => {
            onClose?.();
          }, 300); // Wait for animation to complete
        }, duration);

        return () => clearTimeout(timer);
      }
      
      return undefined;
    }, [duration, onClose]);

    const handleClose = () => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300);
    };

    return (
      <div
        ref={ref}
        className={cn(
          toastVariants({ variant }),
          isVisible ? 'animate-in slide-in-from-right-full' : 'animate-out slide-out-to-right-full',
          className
        )}
        {...props}
      >
        {icon && (
          <div className="flex-shrink-0">
            {icon}
          </div>
        )}
        
        <div className="flex-1 space-y-1">
          {title && (
            <div className="text-sm font-semibold">
              {title}
            </div>
          )}
          
          {(description || children) && (
            <div className="text-sm opacity-90">
              {description || children}
            </div>
          )}
        </div>

        {closable && (
          <button
            onClick={handleClose}
            className="absolute right-2 top-2 rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

Toast.displayName = 'Toast';

/**
 * Toast item interface for toast manager
 */
export interface ToastItem extends Omit<ToastProps, 'onClose'> {
  id: string;
}

/**
 * Toast container component for managing multiple toasts
 */
interface ToastContainerProps {
  /**
   * Array of toast items to display
   */
  toasts: ToastItem[];
  /**
   * Function to remove a toast
   */
  onRemoveToast: (id: string) => void;
  /**
   * Position of toast container
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  /**
   * Maximum number of toasts to show
   */
  maxToasts?: number;
}

const ToastContainer = forwardRef<HTMLDivElement, ToastContainerProps>(
  (
    {
      toasts,
      onRemoveToast,
      position = 'top-right',
      maxToasts = 5,
      ...props
    },
    ref
  ) => {
    const positionClasses = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
    };

    const visibleToasts = toasts.slice(0, maxToasts);

    return (
      <div
        ref={ref}
        className={cn(
          'fixed z-50 flex max-h-screen w-full flex-col-reverse space-y-4 space-y-reverse sm:max-w-sm',
          positionClasses[position]
        )}
        {...props}
      >
        {visibleToasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => onRemoveToast(toast.id)}
          />
        ))}
      </div>
    );
  }
);

ToastContainer.displayName = 'ToastContainer';

/**
 * Toast hook for managing toast state
 * 
 * @example
 * ```tsx
 * const { toasts, addToast, removeToast } = useToast();
 * 
 * const showSuccess = () => {
 *   addToast({
 *     variant: 'success',
 *     title: 'Success!',
 *     description: 'Operation completed successfully.',
 *   });
 * };
 * 
 * return (
 *   <>
 *     <Button onClick={showSuccess}>Show Success Toast</Button>
 *     <ToastContainer
 *       toasts={toasts}
 *       onRemoveToast={removeToast}
 *       position="top-right"
 *     />
 *   </>
 * );
 * ```
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const removeAllToasts = () => {
    setToasts([]);
  };

  return {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
  };
}

export { Toast, ToastContainer, toastVariants };
