'use client';

import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '../atoms/Button';
import LoadingSpinner from '../LoadingSpinner';

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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <ExclamationTriangleIcon className={`w-6 h-6 ${config.icon} mr-2`} />
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            </div>
            {showCancel && (
              <button
                onClick={onClose}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-6">{message}</p>

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
      </div>
    </div>
  );
}
