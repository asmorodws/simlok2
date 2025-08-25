import { useState, useCallback } from 'react';

export interface AlertState {
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export function useAlert() {
  const [alert, setAlert] = useState<AlertState | null>(null);

  const showAlert = useCallback((alertData: AlertState, duration: number = 5000) => {
    setAlert(alertData);
    if (duration > 0) {
      setTimeout(() => setAlert(null), duration);
    }
  }, []);

  const showSuccess = useCallback((message: string, title: string = 'Berhasil!', duration: number = 3000) => {
    showAlert({ variant: 'success', title, message }, duration);
  }, [showAlert]);

  const showError = useCallback((message: string, title: string = 'Error!', duration: number = 5000) => {
    showAlert({ variant: 'error', title, message }, duration);
  }, [showAlert]);

  const showWarning = useCallback((message: string, title: string = 'Peringatan!', duration: number = 4000) => {
    showAlert({ variant: 'warning', title, message }, duration);
  }, [showAlert]);

  const showInfo = useCallback((message: string, title: string = 'Info', duration: number = 4000) => {
    showAlert({ variant: 'info', title, message }, duration);
  }, [showAlert]);

  const hideAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return {
    alert,
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideAlert
  };
}
