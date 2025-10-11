"use client";

import React, { useState } from "react";
import { XMarkIcon, ExclamationTriangleIcon, TrashIcon } from "@heroicons/react/24/outline";
import { UserData } from "@/types/user";
import { useToast } from "@/hooks/useToast";

interface DeleteUserModalProps {
  user: UserData | null;
  isOpen: boolean;
  onClose: () => void;
  onUserDelete: (userId: string) => void;
}

export default function DeleteUserModal({ user, isOpen, onClose, onUserDelete }: DeleteUserModalProps) {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menghapus user');
      }

      const result = await response.json();
      
      if (result.preservedSubmissions && result.preservedSubmissions > 0) {
        showSuccess(
          'User berhasil dihapus', 
          `${result.preservedSubmissions} submission telah dipertahankan dalam sistem`
        );
      } else {
        showSuccess('Berhasil', 'User berhasil dihapus');
      }
      
      onUserDelete(user.id);
      onClose();
      
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showError('Error', error.message || 'Gagal menghapus user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Hapus User</h2>
              <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4 space-y-3">
            <div className="flex items-start p-4 bg-red-50 rounded-lg border border-red-200">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Peringatan!</p>
                <p>Tindakan ini akan menghapus user secara permanen dan tidak dapat dibatalkan.</p>
              </div>
            </div>
            
            {/* <div className="flex items-start p-4 bg-blue-50 rounded-lg border border-blue-200">
              <svg className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium">Catatan Data Submission:</p>
                <p>Semua submission yang dibuat oleh user ini akan tetap dipertahankan dalam sistem untuk menjaga integritas data historis.</p>
              </div>
            </div> */}
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Detail User yang akan dihapus:</h4>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Nama:</span>
                <span className="font-medium text-gray-900">
                  {user.role === 'VENDOR' ? user.vendor_name : user.officer_name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900">{user.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Role:</span>
                <span className="font-medium text-gray-900">{user.role}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium">
                  {user.verified_at || user.verification_status === 'VERIFIED' ? (
                    <span className="text-green-600">Terverifikasi</span>
                  ) : user.rejection_reason || user.verification_status === 'REJECTED' ? (
                    <span className="text-red-600">Ditolak</span>
                  ) : (
                    <span className="text-yellow-600">Menunggu</span>
                  )}
                </span>
              </div>
            </div>

            {/* <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Catatan:</span> Semua data terkait user ini termasuk submission dan riwayat aktivitas akan ikut terhapus.
              </p>
            </div> */}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            {loading ? 'Menghapus...' : 'Ya, Hapus User'}
          </button>
        </div>
      </div>
    </div>
  );
}