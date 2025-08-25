'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface ToastProps {
  id: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export default function Toast({ 
  id, 
  variant, 
  title, 
  message, 
  duration = 5000, 
  onClose 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Show animation
    setIsVisible(true);

    // Auto-hide timer
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Wait for exit animation
  };

  const variantConfig = {
    success: {
      bgColor: 'bg-emerald-50 border-emerald-200',
      iconColor: 'text-emerald-500',
      titleColor: 'text-emerald-800',
      messageColor: 'text-emerald-700',
      icon: CheckCircleIcon
    },
    error: {
      bgColor: 'bg-red-50 border-red-200',
      iconColor: 'text-red-500',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
      icon: ExclamationCircleIcon
    },
    warning: {
      bgColor: 'bg-amber-50 border-amber-200',
      iconColor: 'text-amber-500',
      titleColor: 'text-amber-800',
      messageColor: 'text-amber-700',
      icon: ExclamationTriangleIcon
    },
    info: {
      bgColor: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
      icon: InformationCircleIcon
    }
  };

  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <div
      className={`
        pointer-events-auto w-full overflow-hidden rounded-lg border shadow-lg
        ${config.bgColor}
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
        }
      `}
      style={{ minWidth: '320px', maxWidth: '400px' }}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className={`text-sm font-medium ${config.titleColor} break-words`}>
              {title}
            </p>
            <p className={`mt-1 text-sm ${config.messageColor} break-words`}>
              {message}
            </p>
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              type="button"
              className={`
                inline-flex rounded-md p-1.5 transition-colors duration-200
                ${config.iconColor} hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2
              `}
              onClick={handleClose}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
