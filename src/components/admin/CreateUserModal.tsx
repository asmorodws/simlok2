"use client";

import React from "react";
import { XMarkIcon, UserPlusIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { UserData } from "@/types/user";
import { useUserForm } from "@/hooks/useUserForm";
import Input from "@/components/form/Input";
import PhoneInput from "@/components/form/PhoneInput";
import TextArea from "@/components/form/textarea/TextArea";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreate: (user: UserData) => void;
}

const USER_ROLES = [
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'VERIFIER', label: 'Verifier' },
  { value: 'REVIEWER', label: 'Reviewer' },
  { value: 'APPROVER', label: 'Approver' },
  { value: 'VISITOR', label: 'Visitor' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' }
];

export default function CreateUserModal({ isOpen, onClose, onUserCreate }: CreateUserModalProps) {
  // ✅ Use centralized form hook - replaces ~150 lines of duplicate logic
  const userForm = useUserForm({
    mode: 'create',
    onSuccess: (user) => {
      onUserCreate(user);
      onClose();
    },
  });

  const handleClose = () => {
    userForm.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <UserPlusIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tambah User Baru</h2>
              <p className="text-sm text-gray-500">Buat akun user baru dalam sistem</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={userForm.handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={userForm.formData.role}
                onChange={userForm.handleChange}
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
              {/* Name Fields - Different for VENDOR */}
              {userForm.formData.role === 'VENDOR' ? (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Vendor (Perusahaan) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="vendor_name"
                      type="text"
                      value={userForm.formData.vendor_name}
                      onChange={userForm.handleChange}
                      placeholder="PT. Nama Perusahaan"
                      {...(userForm.errors.vendor_name && { error: userForm.errors.vendor_name })}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Petugas (PIC Vendor) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="officer_name"
                      type="text"
                      value={userForm.formData.officer_name}
                      onChange={userForm.handleChange}
                      placeholder="Nama Lengkap Petugas"
                      {...(userForm.errors.officer_name && { error: userForm.errors.officer_name })}
                      required
                    />
                  </div>
                </>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Petugas <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="officer_name"
                    type="text"
                    value={userForm.formData.officer_name}
                    onChange={userForm.handleChange}
                    placeholder="Nama Lengkap Petugas"
                    {...(userForm.errors.officer_name && { error: userForm.errors.officer_name })}
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
                  value={userForm.formData.email}
                  onChange={userForm.handleChange}
                  placeholder="email@contoh.com"
                  {...(userForm.errors.email && { error: userForm.errors.email })}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    name="password"
                    type={userForm.showPassword ? "text" : "password"}
                    value={userForm.formData.password}
                    onChange={userForm.handleChange}
                    placeholder="Minimal 6 karakter"
                    {...(userForm.errors.password && { error: userForm.errors.password })}
                    required
                  />
                  <button
                    type="button"
                    onClick={userForm.togglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    tabIndex={-1}
                  >
                    {userForm.showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor Telepon
                </label>
                <PhoneInput
                  name="phone_number"
                  value={userForm.formData.phone_number}
                  onChange={userForm.handleChange}
                  placeholder="81234567890"
                  {...(userForm.errors.phone_number && { error: userForm.errors.phone_number })}
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alamat
                </label>
                <TextArea
                  name="address"
                  value={userForm.formData.address}
                  onChange={userForm.handleChange}
                  placeholder="Alamat lengkap"
                  rows={3}
                  {...(userForm.errors.address && { error: userForm.errors.address })}
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
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            onClick={userForm.handleSubmit}
            disabled={userForm.loading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {userForm.loading ? 'Membuat...' : 'Buat User'}
          </button>
        </div>
      </div>
    </div>
  );
}