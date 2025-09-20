"use client";
import React, { useState } from "react";

import Input from "../form/input/InputField";
import TextArea from "../form/textarea/TextArea";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";

interface UserInfoCardProps {
  user: {
    id: string;
    email: string;
    officer_name: string;
    vendor_name: string | null;
    phone_number: string | null;
    address: string | null;
    role: string;
  }
}

export default function UserInfoCard({ user }: UserInfoCardProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    officer_name: "",
    vendor_name: "",
    phone_number: "",
    address: "",
    email: ""
  });
  const [formData, setFormData] = useState({
    officer_name: user.officer_name,
    vendor_name: user.vendor_name || "",
    phone_number: user.phone_number || "",
    address: user.address || "",
    email: user.email
  });

  const validateForm = () => {
    const newErrors = {
      officer_name: "",
      vendor_name: "",
      phone_number: "",
      address: "",
      email: ""
    };
    let isValid = true;

    // Validate Officer Name
    if (!formData.officer_name.trim()) {
      newErrors.officer_name = "Nama petugas wajib diisi";
      isValid = false;
    }

    // Validate Email
    if (!formData.email.trim()) {
      newErrors.email = "Email wajib diisi";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format email tidak valid";
      isValid = false;
    }

    // Validate Phone Number
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = "Nomor telepon wajib diisi";
      isValid = false;
    } else if (!/^[0-9+\-\s()]*$/.test(formData.phone_number)) {
      newErrors.phone_number = "Nomor telepon hanya boleh berisi angka dan karakter + - ( )";
      isValid = false;
    }

    // Validate Vendor Name
    if (!formData.vendor_name.trim()) {
      newErrors.vendor_name = "Nama vendor wajib diisi";
      isValid = false;
    }

    // Validate Address
    if (!formData.address.trim()) {
      newErrors.address = "Alamat wajib diisi";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal memperbarui profil");
      }

      showSuccess("Berhasil", "Profil berhasil diperbarui");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating profile:", error);
      showError("Error", "Gagal memperbarui profil");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="p-5 border border-gray-200 rounded-2xl lg:p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-800">
            Informasi Pribadi
          </h4>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Ubah
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFormData({
                    officer_name: user.officer_name,
                    vendor_name: user.vendor_name || "",
                    phone_number: user.phone_number || "",
                    address: user.address || "",
                    email: user.email
                  });
                  setIsEditing(false);
                }}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="inline-flex items-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-500">Nama Petugas</p>
            {isEditing ? (
              <Input 
                type="text"
                name="officer_name"
                value={formData.officer_name}
                onChange={handleChange}
                className="mt-1"
                error={errors.officer_name}
              />
            ) : (
              <p className="mt-1 text-base text-gray-900">{user.officer_name}</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            {isEditing ? (
              <Input 
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1"
                error={errors.email}
              />
            ) : (
              <p className="mt-1 text-base text-gray-900">{user.email}</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Nomor Telepon</p>
            {isEditing ? (
              <Input 
                type="text"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="mt-1"
                error={errors.phone_number}
              />
            ) : (
              <p className="mt-1 text-base text-gray-900">{user.phone_number || "-"}</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Nama Vendor</p>
            {isEditing ? (
              <Input 
                type="text"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleChange}
                className="mt-1"
                error={errors.vendor_name}
              />
            ) : (
              <p className="mt-1 text-base text-gray-900">{user.vendor_name || "-"}</p>
            )}
          </div>

          <div className="lg:col-span-2">
            <p className="text-sm font-medium text-gray-500">Alamat</p>
            {isEditing ? (
              <TextArea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="mt-1"
                rows={3}
                error={errors.address}
              />
            ) : (
              <p className="mt-1 text-base text-gray-900 whitespace-pre-line">{user.address || "-"}</p>
            )}
          </div>

        </div>
      </div>


    </div>
  );
}
