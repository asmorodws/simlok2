"use client";

import React, { useEffect } from "react";
import { XMarkIcon, UserIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { UserData } from "@/types/user";
import { useUserForm } from "@/hooks/useUserForm";
import Input from "@/components/form/Input";
import PhoneInput from "@/components/form/PhoneInput";
import TextArea from "@/components/form/textarea/TextArea";

interface ReviewerEditUserModalProps {
  user: UserData | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate: (user: UserData) => void;
}

export default function ReviewerEditUserModal({ user, isOpen, onClose, onUserUpdate }: ReviewerEditUserModalProps) {
  // ✅ Use centralized form hook - replaces ~150 lines of duplicate logic
  const userForm = useUserForm({
    mode: 'edit',
    userId: user?.id,
    roleRestriction: 'VENDOR',
    initialData: {
      officer_name: user?.officer_name || '',
      vendor_name: user?.vendor_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      address: user?.address || '',
      role: 'VENDOR',
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
        role: 'VENDOR',
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
                <p className="text-sm text-gray-500">Perbarui informasi user vendor</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={userForm.loading}
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={userForm.handleSubmit} className="p-6">
              <div className="space-y-6">
                
                {/* Role Display */}
                <div className="p-4 rounded-lg border border-gray-200 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Role User</p>
                      <p className="text-sm text-gray-600 mt-1">User ini memiliki role Vendor</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      VENDOR
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vendor Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Vendor <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="vendor_name"
                      type="text"
                      value={userForm.formData.vendor_name}
                      onChange={userForm.handleChange}
                      placeholder="PT. Nama Perusahaan"
                      error={userForm.errors.vendor_name || ''}
                      disabled={userForm.loading}
                      required
                    />
                  </div>

                  {/* Officer Name */}
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
                      error={userForm.errors.officer_name || ''}
                      disabled={userForm.loading}
                      required
                    />
                  </div>

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
                      error={userForm.errors.email || ''}
                      disabled={userForm.loading}
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
                      value={userForm.formData.phone_number}
                      onChange={userForm.handleChange}
                      placeholder="081234567890"
                      disabled={userForm.loading}
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
                        type={userForm.showPassword ? "text" : "password"}
                        value={userForm.formData.password}
                        onChange={userForm.handleChange}
                        placeholder="Masukkan password"
                        error={userForm.errors.password || ''}
                        disabled={userForm.loading}
                      />
                      <button
                        type="button"
                        onClick={userForm.togglePasswordVisibility}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                        tabIndex={-1}
                        disabled={userForm.loading}
                      >
                        {userForm.showPassword ? (
                          <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                          <EyeIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Kosongkan field ini jika tidak ingin mengubah password user
                    </p>
                  </div>

                  {/* Account Status Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status Akun
                    </label>
                    <div className={`p-2 rounded-xl border-2 transition-all ${userForm.formData.isActive
                      ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50'
                      : 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50'
                      }`}>
                      <div className="flex items-center justify-between">
                        {/* Status Display */}
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${userForm.formData.isActive ? 'bg-green-500' : 'bg-red-500'
                              }`}
                          >
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              {userForm.formData.isActive ? (
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
                              {userForm.formData.isActive ? 'AKUN AKTIF' : 'AKUN NONAKTIF'}
                            </p>
                          </div>
                        </div>

                        {/* Toggle Button */}
                        <button
                          type="button"
                          onClick={() => userForm.setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-md ${userForm.formData.isActive
                            ? 'bg-green-600 focus:ring-green-300'
                            : 'bg-red-500 focus:ring-red-300'
                            }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 flex items-center justify-center font-bold text-[10px] ${userForm.formData.isActive ? 'translate-x-4 text-green-600' : 'translate-x-1 text-red-500'
                              }`}
                          >
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status Verifikasi
                  </label>
                  <select
                    name="verification_status"
                    value={userForm.formData.verification_status}
                    onChange={userForm.handleChange}
                    disabled={userForm.loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="PENDING">Menunggu Verifikasi</option>
                    <option value="VERIFIED">Terverifikasi</option>
                    <option value="REJECTED">Ditolak</option>
                  </select>
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
                    disabled={userForm.loading}
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
