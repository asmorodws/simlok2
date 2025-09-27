import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../atoms';

export interface ModalProps {
  /** Modal open state */
  isOpen: boolean;
  
  /** Close handler */
  onClose: () => void;
  
  /** Modal title */
  title?: string;
  
  /** Modal children */
  children: React.ReactNode;
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /** Hide close button */
  hideCloseButton?: boolean;
  
  /** Additional classes */
  className?: string;
}

/**
 * Modal Molecule Component
 * 
 * Reusable modal component dengan overlay dan close functionality
 * Part dari Atomic Design System
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  hideCloseButton = false,
  className
}) => {
  // Don't render if closed
  if (!isOpen) return null;

  // Size variants
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg', 
    xl: 'max-w-xl',
    full: 'max-w-4xl'
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Always set up event listeners, but only respond when open
    document.addEventListener('keydown', handleEscape);
    
    // Control body overflow based on isOpen state
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          'relative w-full bg-white rounded-lg shadow-xl',
          'transform transition-all duration-300 ease-out',
          'animate-in fade-in-0 zoom-in-95',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            )}
            
            {!hideCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};