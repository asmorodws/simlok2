'use client';

import { useState, useCallback } from 'react';
import Toast, { ToastProps } from './Toast';

interface ToastData {
  id: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface ToastContextType {
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  // Expose methods globally for easy access
  if (typeof window !== 'undefined') {
    (window as any).showToast = addToast;
  }

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col space-y-2 pointer-events-none max-w-sm w-full"
      style={{ zIndex: 9999 }}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          variant={toast.variant}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </div>
  );
}
