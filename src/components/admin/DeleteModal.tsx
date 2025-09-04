"use client";

import { useState } from "react";
import { UserData } from "@/types/user";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user?: UserData | null;
}

export default function DeleteModal({ isOpen, onClose, onConfirm, user }: DeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!user) return;
    
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghapus user");
      }

      onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

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
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Konfirmasi Hapus</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <p className="text-sm text-gray-600 mb-4">
              Apakah Anda yakin ingin menghapus user berikut? Tindakan ini tidak dapat dibatalkan.
            </p>
            
            {/* User Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm">
                <div className="font-medium text-gray-900">{user.officer_name}</div>
                <div className="text-gray-600">{user.email}</div>
                <div className="text-gray-600 capitalize">{user.role.toLowerCase()}</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 hover:text-gray-800 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 hover:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
