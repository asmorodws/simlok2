'use client';

import { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import ConfirmModal from '@/components/ui/modal/ConfirmModal';
import { useToast } from '@/hooks/useToast';

interface User {
  id: string;
  officer_name: string;
  email: string;
  role: string;
}

interface DeleteUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserDelete: (userId: string) => void;
}

export default function DeleteUserModal({ user, isOpen, onClose, onUserDelete }: DeleteUserModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  if (!user) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal menghapus user');
      }

      showSuccess('Sukses', 'User berhasil dihapus');
      onUserDelete(user.id);
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('Error', error instanceof Error ? error.message : 'Gagal menghapus user');
    } finally {
      setLoading(false);
    }
  };

  const message = (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-900 mb-2">Data User yang Akan Dihapus:</h4>
            <dl className="space-y-1 text-sm">
              <div className="flex">
                <dt className="font-medium text-red-800 w-20">Nama:</dt>
                <dd className="text-red-700">{user.officer_name}</dd>
              </div>
              <div className="flex">
                <dt className="font-medium text-red-800 w-20">Email:</dt>
                <dd className="text-red-700">{user.email}</dd>
              </div>
              <div className="flex">
                <dt className="font-medium text-red-800 w-20">Role:</dt>
                <dd className="text-red-700">{user.role}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Catatan:</strong> Submission yang dibuat oleh user ini tidak akan terhapus dan akan tetap tersimpan di sistem.
        </p>
      </div>

      <p className="text-gray-700">Apakah Anda yakin ingin menghapus user ini?</p>
    </div>
  );

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDelete}
      title="Hapus User"
      message={message}
      confirmText="Hapus User"
      cancelText="Batal"
      variant="danger"
      isLoading={loading}
    />
  );
}
