'use client';

interface ToastOptions {
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

declare global {
  interface Window {
    showToast?: (toast: ToastOptions) => void;
  }
}

export function useToast() {
  const showToast = (toast: ToastOptions) => {
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(toast);
    }
  };

  const showSuccess = (title: string, message: string, duration?: number) => {
    showToast({ variant: 'success', title, message, duration: duration || 5000 });
  };

  const showError = (title: string, message: string, duration?: number) => {
    showToast({ variant: 'error', title, message, duration: duration || 5000 });
  };

  const showWarning = (title: string, message: string, duration?: number) => {
    showToast({ variant: 'warning', title, message, duration: duration || 5000 });
  };

  const showInfo = (title: string, message: string, duration?: number) => {
    showToast({ variant: 'info', title, message, duration: duration || 5000 });
  };

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}
