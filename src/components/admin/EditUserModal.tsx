"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, UserIcon } from "@heroicons/react/24/outline";
import { UserData } from "@/types/user";
import { useToast } from "@/hooks/useToast";
import Input from "@/components/form/Input";
import TextArea from "@/components/form/textarea/TextArea";

interface EditUserModalProps {
  user: UserData | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate: (user: UserData) => void;
}

const USER_ROLES = [
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'VERIFIER', label: 'Verifier' },
  { value: 'REVIEWER', label: 'Reviewer' },
  { value: 'APPROVER', label: 'Approver' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' }
];

export default function EditUserModal({ user, isOpen, onClose, onUserUpdate }: EditUserModalProps) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    officer_name: '',
    vendor_name: '',
    email: '',
    phone_number: '',
    address: '',
    role: 'VENDOR'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        officer_name: user.officer_name || '',
        vendor_name: user.vendor_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
        role: user.role || 'VENDOR'
      });
      setErrors({});
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    if (formData.role === 'VENDOR') {
      if (!formData.vendor_name.trim()) {
        newErrors.vendor_name = 'Nama vendor wajib diisi untuk role vendor';
      }
    } else {
      if (!formData.officer_name.trim()) {
        newErrors.officer_name = 'Nama petugas wajib diisi';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const dataToSend = {
        ...formData,
        // Clean up data based on role
        vendor_name: formData.role === 'VENDOR' ? formData.vendor_name : null,
        officer_name: formData.role !== 'VENDOR' ? formData.officer_name : null
      };

      const response = await fetch(`/api/admin/users/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengupdate user');
      }

      const result = await response.json();
      
      showSuccess('Berhasil', 'Data user berhasil diperbarui');
      onUserUpdate(result.user);
      onClose();
      
    } catch (error: any) {
      console.error('Error updating user:', error);
      showError('Error', error.message || 'Gagal mengupdate user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
              <p className="text-sm text-gray-500">Perbarui informasi user</p>
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
        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          <div className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {USER_ROLES.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Conditional Name Fields */}
              {formData.role === 'VENDOR' ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Vendor <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="vendor_name"
                    type="text"
                    value={formData.vendor_name}
                    onChange={handleChange}
                    placeholder="PT. Nama Perusahaan"
                    {...(errors.vendor_name && { error: errors.vendor_name })}
                    required
                  />
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Petugas <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="officer_name"
                    type="text"
                    value={formData.officer_name}
                    onChange={handleChange}
                    placeholder="Nama Lengkap Petugas"
                    {...(errors.officer_name && { error: errors.officer_name })}
                    required
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  {...(errors.email && { error: errors.email })}
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor Telepon
                </label>
                <Input
                  name="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="08123456789"
                  {...(errors.phone_number && { error: errors.phone_number })}
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alamat
                </label>
                <TextArea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Alamat lengkap"
                  rows={3}
                  {...(errors.address && { error: errors.address })}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}