"use client";

import React, { useState, useEffect } from "react";
import { UserIcon, UserPlusIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { UserData } from "@/types/user";
import { useToast } from "@/hooks/useToast";
import Input from "@/components/ui/input/Input";
import PhoneInput from "@/components/ui/input/PhoneInput";
import TextArea from "@/components/ui/input/TextArea";
import { Badge } from "@/components/ui/badge/Badge";
import BaseModal from "@/components/ui/modal/BaseModal";
import Button from "@/components/ui/button/Button";

interface UserFormModalProps {
  mode: 'create' | 'edit';
  user?: UserData | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate?: (user: UserData) => void;
  onUserCreate?: (user: UserData) => void;
  allowRoleEdit?: boolean;
}

const USER_ROLES = [
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'VERIFIER', label: 'Verifier' },
  { value: 'REVIEWER', label: 'Reviewer' },
  { value: 'APPROVER', label: 'Approver' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' }
];

interface FormData {
  officer_name: string;
  vendor_name: string;
  email: string;
  phone_number: string;
  address: string;
  role: string;
  password: string;
  isActive: boolean;
  verification_status: string;
}

export default function UserFormModal({ 
  mode,
  user, 
  isOpen, 
  onClose, 
  onUserUpdate,
  onUserCreate,
  allowRoleEdit = true 
}: UserFormModalProps) {
  const { showError, showSuccess } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<FormData>({
    officer_name: '',
    vendor_name: '',
    email: '',
    phone_number: '',
    address: '',
    role: 'VENDOR',
    password: '',
    isActive: true,
    verification_status: 'PENDING'
  });

  // Update form when user changes (edit mode)
  useEffect(() => {
    if (mode === 'edit' && user) {
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
    } else if (mode === 'create') {
      setFormData({
        officer_name: '',
        vendor_name: '',
        email: '',
        phone_number: '',
        address: '',
        role: 'VENDOR',
        password: '',
        isActive: true,
        verification_status: 'PENDING'
      });
    }
  }, [user, mode, isOpen]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.officer_name.trim()) {
      newErrors.officer_name = 'Nama petugas wajib diisi';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Nomor HP wajib diisi';
    }

    if (mode === 'create' && !formData.password.trim()) {
      newErrors.password = 'Password wajib diisi';
    }

    if (formData.password.trim() && formData.password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const url = mode === 'edit' ? `/api/users/${user?.id}` : '/api/users';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const payload: any = {
        officer_name: formData.officer_name,
        email: formData.email,
        phone_number: formData.phone_number,
        address: formData.address,
        role: formData.role,
      };

      if (formData.role === 'VENDOR') {
        payload.vendor_name = formData.vendor_name;
      }

      if (formData.password.trim()) {
        payload.password = formData.password;
      }

      if (mode === 'edit') {
        payload.isActive = formData.isActive;
        payload.verification_status = formData.verification_status;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Gagal ${mode === 'edit' ? 'mengupdate' : 'membuat'} user`);
      }

      const result = await response.json();
      
      showSuccess(
        'Berhasil',
        mode === 'edit' ? 'User berhasil diupdate' : 'User berhasil ditambahkan'
      );

      if (mode === 'edit' && onUserUpdate) {
        onUserUpdate(result.user);
      } else if (mode === 'create' && onUserCreate) {
        onUserCreate(result.user);
      }

      onClose();
      
    } catch (error: any) {
      console.error(`Error ${mode} user:`, error);
      showError('Error', error.message || `Gagal ${mode === 'edit' ? 'mengupdate' : 'membuat'} user`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'edit' && !user) return null;

  const isEditMode = mode === 'edit';
  const title = isEditMode ? 'Edit User' : 'Tambah User Baru';
  const description = isEditMode ? 'Perbarui informasi user' : 'Isi form untuk menambahkan user baru';
  const Icon = isEditMode ? UserIcon : UserPlusIcon;

  const icon = (
    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
      <Icon className="w-5 h-5 text-blue-600" />
    </div>
  );

  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        variant="secondary"
      >
        Batal
      </Button>
      <Button
        type="button"
        onClick={() => {
          const form = document.getElementById('user-form') as HTMLFormElement;
          form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }}
        disabled={isSubmitting}
        variant="primary"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Menyimpan...
          </>
        ) : (
          isEditMode ? 'Simpan Perubahan' : 'Tambah User'
        )}
      </Button>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={description}
      icon={icon}
      footer={footer}
      size="lg"
      contentClassName="max-h-[60vh]"
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <form id="user-form" onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Account Status Toggle (Edit mode only) */}
                {isEditMode && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Status Akun</span>
                        <Badge variant={formData.isActive ? 'success' : 'destructive'}>
                          {formData.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.isActive 
                          ? 'User dapat mengakses sistem' 
                          : 'User tidak dapat login'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => handleFieldChange('isActive', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                )}

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleFieldChange('role', e.target.value)}
                    disabled={!allowRoleEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    required
                  >
                    {USER_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Officer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Petugas <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.officer_name}
                    onChange={(e) => handleFieldChange('officer_name', e.target.value)}
                    placeholder="Masukkan nama petugas"
                    required
                  />
                  {errors.officer_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.officer_name}</p>
                  )}
                </div>

                {/* Vendor Name (if role is VENDOR) */}
                {formData.role === 'VENDOR' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Vendor
                    </label>
                    <Input
                      value={formData.vendor_name}
                      onChange={(e) => handleFieldChange('vendor_name', e.target.value)}
                      placeholder="Masukkan nama vendor"
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="email@example.com"
                    required
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor HP <span className="text-red-500">*</span>
                  </label>
                  <PhoneInput
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={(value) => handleFieldChange('phone_number', value)}
                    placeholder="08123456789"
                    required
                  />
                  {errors.phone_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {!isEditMode && <span className="text-red-500">*</span>}
                    {isEditMode && <span className="text-gray-500 text-xs"> (kosongkan jika tidak ingin mengubah)</span>}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      placeholder={isEditMode ? "Masukkan password baru (opsional)" : "Masukkan password"}
                      required={!isEditMode}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat
                  </label>
                  <TextArea
                    value={formData.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="Masukkan alamat lengkap"
                    rows={3}
                  />
                </div>
              </div>
            </form>
    </BaseModal>
  );
}
