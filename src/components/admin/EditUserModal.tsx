"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, UserIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { UserData } from "@/types/user";
import { useToast } from "@/hooks/useToast";
import Input from "@/components/form/Input";
import PhoneInput from "@/components/form/PhoneInput";
import TextArea from "@/components/form/textarea/TextArea";
import { Badge } from "../ui/Badge";
import { normalizePhoneNumber, validatePhoneNumberWithMessage } from "@/utils/phoneNumber";

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
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    officer_name: '',
    vendor_name: '',
    email: '',
    phone_number: '',
    address: '',
    role: 'VENDOR',
    password: '',
    isActive: true,
    verification_status: 'PENDING' as 'PENDING' | 'VERIFIED' | 'REJECTED'
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
        role: user.role || 'VENDOR',
        password: '',
        isActive: user.isActive ?? true,
        verification_status: user.verification_status || 'PENDING'
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

    // Validasi nomor telepon jika diisi
    if (formData.phone_number && formData.phone_number.trim()) {
      const phoneValidation = validatePhoneNumberWithMessage(formData.phone_number.trim(), {
        required: false,
        minLength: 9,
        maxLength: 13,
      });
      
      if (!phoneValidation.isValid) {
        newErrors.phone_number = phoneValidation.error || 'Nomor telepon tidak valid';
      }
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

    // Validate password if provided
    if (formData.password.trim()) {
      if (formData.password.length < 6) {
        newErrors.password = 'Password harus minimal 6 karakter';
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
        email: formData.email,
        phone_number: normalizePhoneNumber(formData.phone_number),
        address: formData.address,
        role: formData.role,
        isActive: formData.isActive,
        verification_status: formData.verification_status,
        // Clean up data based on role
        vendor_name: formData.role === 'VENDOR' ? formData.vendor_name : null,
        officer_name: formData.role !== 'VENDOR' ? formData.officer_name : null,
        // Only send password if it's not empty, otherwise send undefined to be excluded
        password: formData.password.trim() !== '' ? formData.password : undefined
      };

      const response = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Gagal mengupdate user');
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
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
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
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* Account Status Toggle - Simple & Clear */}
                

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
                      Alamat Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@contoh.com"
                      {...(errors.email && { error: errors.email })}
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nomor Telepon
                    </label>
                    <PhoneInput
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      placeholder="81234567890"
                      {...(errors.phone_number && { error: errors.phone_number })}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password Baru
                    </label>
                    <div className="relative">
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Masukkan password"
                        {...(errors.password && { error: errors.password })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                          <EyeIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <Badge variant="warning">
                                                                Kosongkan field ini jika tidak ingin mengubah password user
                                                            </Badge>
                  </div>

                  {/* Account Status Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status Akun
                    </label>
                    <div className={`p-2 rounded-xl border-2 transition-all ${formData.isActive
                        ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50'
                        : 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50'
                      }`}>
                      <div className="flex items-center justify-between">
                        {/* Status Display */}
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${formData.isActive ? 'bg-green-500' : 'bg-red-500'
                              }`}
                          >
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              {formData.isActive ? (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              ) : (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              )}
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-900">
                              {formData.isActive ? 'AKUN AKTIF' : 'AKUN NONAKTIF'}
                            </p>
                          </div>
                        </div>

                        {/* Toggle Button */}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-md ${formData.isActive
                              ? 'bg-green-600 focus:ring-green-300'
                              : 'bg-red-500 focus:ring-red-300'
                            }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 flex items-center justify-center font-bold text-[10px] ${formData.isActive ? 'translate-x-4 text-green-600' : 'translate-x-1 text-red-500'
                              }`}
                          >
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Verification Status */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status Verifikasi
                    </label>
                    <select
                      name="verification_status"
                      value={formData.verification_status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="PENDING">Menunggu Verifikasi</option>
                      <option value="VERIFIED">Terverifikasi</option>
                      <option value="REJECTED">Ditolak</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Ubah status verifikasi user
                    </p>
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
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
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
    </>
  );
}