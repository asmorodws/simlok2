import { useState, useCallback } from 'react';

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

export function useConfirmModal() {
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  const showConfirm = useCallback((options: Omit<ConfirmModalState, 'isOpen'>) => {
    setConfirmModal({
      ...options,
      isOpen: true
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const confirmDelete = useCallback((message: string, onConfirm: () => void, title: string = 'Konfirmasi Hapus') => {
    showConfirm({
      title,
      message,
      onConfirm,
      variant: 'danger',
      confirmText: 'Hapus',
      cancelText: 'Batal'
    });
  }, [showConfirm]);

  return {
    confirmModal,
    showConfirm,
    hideConfirm,
    confirmDelete
  };
}
