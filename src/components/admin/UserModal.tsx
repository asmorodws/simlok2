"use client";

import { useState, useEffect } from "react";
import { Role } from "@prisma/client";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface User {
  id: string;
  nama_petugas: string;
  email: string;
  role: Role;
  alamat?: string;
  no_telp?: string;
  nama_vendor?: string;
  date_created_at: string;
  verified_at?: string;
  verified_by?: string;
  foto_profil?: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  user?: User | null;
  mode: "add" | "edit";
}

interface FormData {
  nama_petugas: string;
  email: string;
  password: string;
  role: Role;
  alamat: string;
  no_telp: string;
  nama_vendor: string;
  verified_at: string;
}

export default function UserModal({ isOpen, onClose, onSave, user, mode }: UserModalProps) {
  const [formData, setFormData] = useState<FormData>({
    nama_petugas: "",
    email: "",
    password: "",
    role: Role.VENDOR,
    alamat: "",
    no_telp: "",
    nama_vendor: "",
    verified_at: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && user) {
        setFormData({
          nama_petugas: user.nama_petugas,
          email: user.email,
          password: "",
          role: user.role,
          alamat: user.alamat || "",
          no_telp: user.no_telp || "",
          nama_vendor: user.nama_vendor || "",
          verified_at: user.verified_at ? new Date(user.verified_at).toISOString().slice(0, 16) : "",
        });
      } else {
        setFormData({
          nama_petugas: "",
          email: "",
          password: "",
          role: Role.VENDOR,
          alamat: "",
          no_telp: "",
          nama_vendor: "",
          verified_at: "",
        });
      }
      setError("");
    }
  }, [isOpen, mode, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const submitData: any = { ...formData };
      
      // Remove empty password for edit mode
      if (mode === "edit" && !submitData.password) {
        delete submitData.password;
      }

      // Handle verified_at
      if (submitData.verified_at) {
        submitData.verified_at = new Date(submitData.verified_at).toISOString();
      } else {
        delete submitData.verified_at;
      }

      // Remove nama_vendor if role is not VENDOR
      if (submitData.role !== Role.VENDOR) {
        submitData.nama_vendor = "";
      }

      const url = mode === "add" ? "/api/users" : `/api/users/${user?.id}`;
      const method = mode === "add" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Terjadi kesalahan");
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {mode === "add" ? "Tambah User Baru" : "Edit User"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nama Petugas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Petugas *
              </label>
              <input
                type="text"
                required
                value={formData.nama_petugas}
                onChange={(e) => handleInputChange("nama_petugas", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan nama petugas"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {mode === "add" ? "*" : "(kosongkan jika tidak diubah)"}
              </label>
              <input
                type="password"
                required={mode === "add"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mode === "add" ? "Masukkan password" : "Kosongkan jika tidak diubah"}
                minLength={6}
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={Role.VENDOR}>Vendor</option>
                <option value={Role.VERIFIER}>Verifier</option>
              </select>
            </div>

            {/* No Telepon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No Telepon
              </label>
              <input
                type="tel"
                value={formData.no_telp}
                onChange={(e) => handleInputChange("no_telp", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan nomor telepon"
              />
            </div>

            {/* Nama Vendor (hanya untuk role VENDOR) */}
            {formData.role === Role.VENDOR && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Vendor
                </label>
                <input
                  type="text"
                  value={formData.nama_vendor}
                  onChange={(e) => handleInputChange("nama_vendor", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Masukkan nama vendor"
                />
              </div>
            )}

            {/* Verified At (hanya untuk edit) */}
            {mode === "edit" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Verifikasi
                </label>
                <input
                  type="datetime-local"
                  value={formData.verified_at}
                  onChange={(e) => handleInputChange("verified_at", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alamat
            </label>
            <textarea
              rows={3}
              value={formData.alamat}
              onChange={(e) => handleInputChange("alamat", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Masukkan alamat lengkap"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Menyimpan..." : mode === "add" ? "Tambah" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
