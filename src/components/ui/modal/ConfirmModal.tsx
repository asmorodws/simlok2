'use client';

import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Button from '../button/Button';
import LoadingSpinner from '../loading/LoadingSpinner';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  showCancel = true,
  variant = 'danger',
  isLoading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 border-red-600'
    },
    warning: {
      icon: 'text-amber-500',
      button: 'bg-amber-500 hover:bg-amber-600 border-amber-500'
    },
    info: {
      icon: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 border-blue-600'
    }
  };

  const config = variantConfig[variant];

  return (
    <div className="fixed inset-0  bg-gray-600/50  overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className={`w-6 h-6 ${config.icon} mr-2`} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
          </div>
          {showCancel && (
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3">
          {showCancel && (
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              variant="outline"
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`text-white ${config.button} focus:ring-2 focus:ring-offset-2`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <LoadingSpinner size="sm" className="mr-2" />
                Loading...
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
