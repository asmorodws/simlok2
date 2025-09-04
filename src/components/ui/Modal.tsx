import { type VariantProps, cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import { forwardRef, useEffect } from 'react';

import { cn } from '@/lib/utils';
import { Button } from './Button';

/**
 * Modal component variants
 */
const modalVariants = cva(
  'fixed inset-0 z-50 flex items-center justify-center',
  {
    variants: {
      backdrop: {
        default: 'bg-black/50',
        dark: 'bg-black/70',
        light: 'bg-black/30',
        none: '',
      },
    },
    defaultVariants: {
      backdrop: 'default',
    },
  }
);

const modalContentVariants = cva(
  'relative bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden',
  {
    variants: {
      size: {
        sm: 'w-full max-w-sm',
        md: 'w-full max-w-md',
        lg: 'w-full max-w-lg',
        xl: 'w-full max-w-xl',
        '2xl': 'w-full max-w-2xl',
        '3xl': 'w-full max-w-3xl',
        '4xl': 'w-full max-w-4xl',
        '5xl': 'w-full max-w-5xl',
        full: 'w-full h-full max-w-none rounded-none',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface ModalProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modalVariants>,
    VariantProps<typeof modalContentVariants> {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Function to call when modal should close
   */
  onClose: () => void;
  /**
   * Modal title
   */
  title?: string;
  /**
   * Whether to show close button
   */
  showCloseButton?: boolean;
  /**
   * Whether clicking backdrop closes modal
   */
  closeOnBackdropClick?: boolean;
  /**
   * Whether pressing escape closes modal
   */
  closeOnEscape?: boolean;
  /**
   * Custom header content
   */
  header?: React.ReactNode;
  /**
   * Footer content
   */
  footer?: React.ReactNode;
}

/**
 * Reusable Modal component with customizable sizes and behaviors
 * 
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   title="Confirmation"
 *   size="md"
 *   footer={
 *     <div className="flex justify-end gap-2">
 *       <Button variant="outline" onClick={() => setIsModalOpen(false)}>
 *         Cancel
 *       </Button>
 *       <Button onClick={handleConfirm}>
 *         Confirm
 *       </Button>
 *     </div>
 *   }
 * >
 *   <p>Are you sure you want to continue?</p>
 * </Modal>
 * ```
 */
const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      className,
      backdrop,
      size,
      showCloseButton = true,
      closeOnBackdropClick = true,
      closeOnEscape = true,
      header,
      footer,
      ...props
    },
    ref
  ) => {
    // Handle escape key
    useEffect(() => {
      if (!isOpen || !closeOnEscape) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && closeOnBackdropClick) {
        onClose();
      }
    };

    return (
      <div
        className={cn(modalVariants({ backdrop, className }))}
        onClick={handleBackdropClick}
        ref={ref}
        {...props}
      >
        <div className={cn(modalContentVariants({ size }))}>
          {/* Header */}
          {(title || header || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex-1">
                {header || (
                  title && (
                    <h2 className="text-lg font-semibold text-gray-900">
                      {title}
                    </h2>
                  )
                )}
              </div>
              
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-1 ml-4"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

export { Modal, modalVariants, modalContentVariants };
