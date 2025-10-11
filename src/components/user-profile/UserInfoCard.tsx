"use client";

import React, { useState } from "react";
import Input from "../form/Input";
import TextArea from "../form/textarea/TextArea";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import ConfirmationModal from "../common/ConfirmationModal";

interface UserInfoCardProps {
  user: {
    id: string;
    email: string;
    officer_name: string;
    vendor_name: string | null;
    phone_number: string | null;
    address: string | null;
    role: string;
  };
}

export default function UserInfoCard({ user }: UserInfoCardProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [errors, setErrors] = useState({
    officer_name: "",
    vendor_name: "",
    phone_number: "",
    address: "",
    email: "",
  });

  const [formData, setFormData] = useState({
    officer_name: user.officer_name ?? "",
    vendor_name: user.vendor_name ?? "",
    phone_number: user.phone_number ?? "",
    address: user.address ?? "",
    email: user.email ?? "",
  });

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = () => {
    if (user.role === "VENDOR") {
      return (
        formData.email.trim() &&
        formData.phone_number.trim() &&
        formData.address.trim()
      );
    }
    return (
      formData.officer_name.trim() &&
      formData.email.trim() &&
      formData.phone_number.trim() &&
      formData.address.trim()
    );
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    // Untuk alamat, boleh karakter khusus, jadi tidak filter keras
    if (name === "address") {
      setFormData((prev) => ({ ...prev, [name]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSaveConfirm = async () => {
    try {
      setIsLoading(true);

      const newErrors = {
        officer_name: "",
        vendor_name: "",
        phone_number: "",
        address: "",
        email: "",
      };

      if (!formData.officer_name.trim()) {
        newErrors.officer_name = "Nama petugas wajib diisi";
      }
      if (!formData.phone_number.trim()) {
        newErrors.phone_number = "Nomor telepon wajib diisi";
      }
      if (!formData.address.trim()) {
        newErrors.address = "Alamat wajib diisi";
      }
      if (!formData.email.trim() || !validateEmail(formData.email.trim())) {
        newErrors.email = "Format email tidak valid";
      }

      const hasErrors = Object.values(newErrors).some((e) => e !== "");
      if (hasErrors) {
        setErrors(newErrors);
        const first = Object.values(newErrors).find((e) => e !== "");
        if (first) showError("Error", first);
        setIsLoading(false);
        return;
      }

      const dataToSend =
        user.role === "VENDOR"
          ? {
              officer_name: formData.officer_name.trim(),
              phone_number: formData.phone_number.trim(),
              address: formData.address.trim(),
              email: formData.email.trim(),
            }
          : {
              officer_name: formData.officer_name.trim(),
              phone_number: formData.phone_number.trim(),
              address: formData.address.trim(),
              email: formData.email.trim(),
            };

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(text || "Gagal memperbarui profil");
      }

      showSuccess("Berhasil", "Profil berhasil diperbarui");
      setIsEditing(false);
      setShowConfirmModal(false);
      router.refresh();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      showError("Error", error?.message ?? "Gagal memperbarui profil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    setErrors({
      officer_name: "",
      vendor_name: "",
      phone_number: "",
      address: "",
      email: "",
    });

    if (!validateEmail(formData.email.trim())) {
      setErrors((prev) => ({ ...prev, email: "Format email tidak valid" }));
      showError("Error", "Format email tidak valid");
      return;
    }

    if (!validateForm()) {
      showError("Error", "Mohon isi semua field yang wajib diisi");
      return;
    }

    setShowConfirmModal(true);
  };

  return (
    <>
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
                Ubah
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFormData({
                      officer_name: user.officer_name ?? "",
                      vendor_name: user.vendor_name ?? "",
                      phone_number: user.phone_number ?? "",
                      address: user.address ?? "",
                      email: user.email ?? "",
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
            {user.role === "VENDOR" && (
              <div className="lg:col-span-2">
                <p className="text-sm font-medium text-gray-500">Nama Vendor</p>
                {isEditing ? (
                  <Input
                    id="vendor_name"
                    name="vendor_name"
                    type="text"
                    value={formData.vendor_name}
                    onChange={handleChange}
                    disabled={true}
                    placeholder="PT. Nama Perusahaan"
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-base text-gray-900">
                    {user.vendor_name || "-"}
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-500">Nama Petugas</p>
              {isEditing ? (
                <Input
                  id="officer_name"
                  name="officer_name"
                  type="text"
                  validationMode="letters"
                  value={formData.officer_name}
                  onChange={handleChange}
                  placeholder="Masukkan nama petugas"
                  required
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-base text-gray-900">
                  {user.officer_name || "-"}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Alamat Email</p>
              {isEditing ? (
                <Input
                  id="email"
                  name="email"
                  type="email"
                  validationMode="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@perusahaan.com"
                  required
                  error={errors.email}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-base text-gray-900">{user.email}</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Nomor Telepon</p>
              {isEditing ? (
                <Input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  validationMode="numbers"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="08123456789"
                  required
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-base text-gray-900">
                  {user.phone_number || "-"}
                </p>
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
                <p className="mt-1 text-base text-gray-900 whitespace-pre-line">
                  {user.address || "-"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleSaveConfirm}
        title="Konfirmasi Perubahan"
        message="Apakah Anda yakin ingin menyimpan perubahan pada profil?"
        confirmText="Simpan"
        cancelText="Batal"
      />
    </>
  );
}
