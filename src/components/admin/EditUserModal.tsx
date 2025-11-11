"use client";

import React, { useEffect } from "react";
import { XMarkIcon, UserIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { UserData } from "@/types/user";
import { useUserForm } from "@/hooks/useUserForm";
import Input from "@/components/form/Input";
import PhoneInput from "@/components/form/PhoneInput";
import TextArea from "@/components/form/textarea/TextArea";
import { Badge } from "../ui/Badge";

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
  // ✅ Use centralized form hook - replaces ~150 lines of duplicate logic
  const userForm = useUserForm({
    mode: 'edit',
    userId: user?.id,
    initialData: {
      officer_name: user?.officer_name || '',
      vendor_name: user?.vendor_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      address: user?.address || '',
      role: (user?.role as any) || 'VENDOR',
      password: '',
      isActive: user?.isActive ?? true,
      verification_status: (user?.verification_status as any) || 'PENDING'
    },
    onSuccess: (updatedUser) => {
      onUserUpdate(updatedUser);
      onClose();
    },
  });

  // Update form when user changes
  useEffect(() => {
    if (user) {
      userForm.setFormData({
        officer_name: user.officer_name || '',
        vendor_name: user.vendor_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
        role: (user.role as any) || 'VENDOR',
        password: '',
        isActive: user.isActive ?? true,
        verification_status: (user.verification_status as any) || 'PENDING'
      });
    }
  }, [user]);

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
            <form onSubmit={userForm.handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* Account Status Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Status Akun</span>
                      <Badge variant={userForm.formData.isActive ? 'success' : 'destructive'}>
                        {userForm.formData.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Status akun user di sistem
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userForm.formData.isActive}
                      onChange={(e) => userForm.setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Verification Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status Verifikasi <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="verification_status"
                    value={userForm.formData.verification_status}
                    onChange={userForm.handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="PENDING">Pending</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

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
                  {/* Conditional Name Fields */}
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

                  {/* Password - Optional for edit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password Baru
                    </label>
                    <div className="relative">
                      <Input
                        name="password"
                        type={userForm.showPassword ? "text" : "password"}
                        value={userForm.formData.password}
                        onChange={userForm.handleChange}
                        placeholder="Kosongkan jika tidak ingin mengubah"
                        {...(userForm.errors.password && { error: userForm.errors.password })}
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
                    <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter. Kosongkan jika tidak ingin mengubah password.</p>
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
                </div>

                {/* Address */}
                <div>
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

              {/* Submit Button */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={userForm.loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={userForm.loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {userForm.loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}