"use client";

import { useState, useEffect } from "react";
import { Role } from "@prisma/client";
import { UserData } from "@/types/user";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/Input";
import Label from "@/components/form/Label";
import { 
  XMarkIcon,
  UserPlusIcon,
  PencilIcon,
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  IdentificationIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  user?: UserData | null;
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
          nama_petugas: user.officer_name,
          email: user.email,
          password: "",
          role: user.role,
          alamat: user.address || "",
          no_telp: user.phone_number || "",
          nama_vendor: user.vendor_name || "",
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
      // Konversi nama bidang dari format form ke format API
      const submitData: any = {
        officer_name: formData.nama_petugas,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        address: formData.alamat,
        phone_number: formData.no_telp,
        vendor_name: formData.nama_vendor,
        verified_at: formData.verified_at
      };
      
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

      // Remove vendor_name if role is not VENDOR
      if (submitData.role !== Role.VENDOR) {
        submitData.vendor_name = "";
      }

      console.log("Mengirim data ke API:", submitData);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <Card className="shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mr-4">
                {mode === "add" ? (
                  <UserPlusIcon className="w-6 h-6 text-brand-600" />
                ) : (
                  <PencilIcon className="w-6 h-6 text-brand-600" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {mode === "add" ? "Tambah User Baru" : "Edit User"}
                </h2>
                <p className="text-sm text-gray-500">
                  {mode === "add" 
                    ? "Buat akun user baru dengan informasi lengkap" 
                    : "Ubah informasi user yang sudah ada"
                  }
                </p>
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
          <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            {/* Error Message */}
            {error && (
              <Card className="bg-red-50 border border-red-200 mb-6">
                <div className="p-4">
                  <div className="flex items-start">
                    <div className="w-5 h-5 text-red-400 mt-0.5 mr-3">⚠️</div>
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                </div>
              </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-gray-500" />
                  Informasi Personal
                </h3>
                
                <Card className="bg-gray-50">
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Nama Petugas */}
                      <div>
                        <div className="flex items-center mb-2">
                          <UserIcon className="w-4 h-4 text-gray-500 mr-2" />
                          <Label>Nama Petugas <span className="text-red-500">*</span></Label>
                        </div>
                        <Input
                          type="text"
                          required
                          value={formData.nama_petugas}
                          onChange={(e) => handleInputChange("nama_petugas", e.target.value)}
                          placeholder="Masukkan nama lengkap petugas"
                          className="w-full"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <div className="flex items-center mb-2">
                          <EnvelopeIcon className="w-4 h-4 text-gray-500 mr-2" />
                          <Label>Email <span className="text-red-500">*</span></Label>
                        </div>
                        <Input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          placeholder="example@company.com"
                          className="w-full"
                        />
                      </div>

                      {/* No Telepon */}
                      <div>
                        <div className="flex items-center mb-2">
                          <PhoneIcon className="w-4 h-4 text-gray-500 mr-2" />
                          <Label>No. Telepon</Label>
                        </div>
                        <Input
                          type="tel"
                          value={formData.no_telp}
                          onChange={(e) => handleInputChange("no_telp", e.target.value)}
                          placeholder="08xxxxxxxxxx"
                          className="w-full"
                        />
                      </div>

                      {/* Role */}
                      <div>
                        <div className="flex items-center mb-2">
                          <IdentificationIcon className="w-4 h-4 text-gray-500 mr-2" />
                          <Label>Role <span className="text-red-500">*</span></Label>
                        </div>
                        <select
                          required
                          value={formData.role}
                          onChange={(e) => handleInputChange("role", e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg 
                                   focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 
                                   bg-white text-gray-900                                   transition-colors duration-200"
                        >
                          <option value={Role.VENDOR}>Vendor</option>
                          <option value={Role.VERIFIER}>Verifier</option>
                          <option value={Role.ADMIN}>Admin</option>
                          <option value={Role.SUPER_ADMIN}>Super Admin</option>
                        </select>
                      </div>
                    </div>

                    {/* Alamat */}
                    <div className="mt-6">
                      <div className="flex items-center mb-2">
                        <MapPinIcon className="w-4 h-4 text-gray-500 mr-2" />
                        <Label>Alamat Lengkap</Label>
                      </div>
                      <textarea
                        rows={3}
                        value={formData.alamat}
                        onChange={(e) => handleInputChange("alamat", e.target.value)}
                        placeholder="Masukkan alamat lengkap termasuk kode pos"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg 
                                 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 
                                 bg-white text-gray-900                                 transition-colors duration-200 resize-none"
                      />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Account Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <ShieldCheckIcon className="w-5 h-5 mr-2 text-gray-500" />
                  Informasi Akun
                </h3>
                
                <Card className="bg-gray-50">
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Password */}
                      <div>
                        <div className="flex items-center mb-2">
                          <LockClosedIcon className="w-4 h-4 text-gray-500 mr-2" />
                          <Label>
                            Password {mode === "add" ? <span className="text-red-500">*</span> : "(kosongkan jika tidak diubah)"}
                          </Label>
                        </div>
                        <Input
                          type="password"
                          required={mode === "add"}
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          placeholder={mode === "add" ? "Minimal 6 karakter" : "Kosongkan jika tidak diubah"}
                          minLength={mode === "add" ? 6 : undefined}
                          className="w-full"
                        />
                        {mode === "edit" && (
                          <p className="text-xs text-gray-500 mt-1">
                            Biarkan kosong untuk mempertahankan password yang ada
                          </p>
                        )}
                      </div>

                      {/* Nama Vendor (hanya untuk role VENDOR) */}
                      {formData.role === Role.VENDOR && (
                        <div>
                          <div className="flex items-center mb-2">
                            <BuildingOfficeIcon className="w-4 h-4 text-gray-500 mr-2" />
                            <Label>Nama Vendor</Label>
                          </div>
                          <Input
                            type="text"
                            value={formData.nama_vendor}
                            onChange={(e) => handleInputChange("nama_vendor", e.target.value)}
                            placeholder="Masukkan nama perusahaan vendor"
                            className="w-full"
                          />
                        </div>
                      )}

                      {/* Verified At (hanya untuk edit mode) */}
                      {mode === "edit" && (
                        <div>
                          <div className="flex items-center mb-2">
                            <ShieldCheckIcon className="w-4 h-4 text-gray-500 mr-2" />
                            <Label>Tanggal Verifikasi</Label>
                          </div>
                          <Input
                            type="datetime-local"
                            value={formData.verified_at}
                            onChange={(e) => handleInputChange("verified_at", e.target.value)}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Kosongkan jika user belum diverifikasi
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Role-specific Information */}
              {formData.role === Role.VENDOR && (
                <Card className="bg-blue-50 border border-blue-200">
                  <div className="p-4">
                    <div className="flex items-start">
                      <BuildingOfficeIcon className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-800 mb-1">
                          Informasi Vendor
                        </p>
                        <p className="text-blue-700">
                          User dengan role Vendor akan memiliki akses untuk mengelola produk, 
                          submission, dan dapat mengisi nama vendor sebagai identitas perusahaan.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              size="md"
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              variant="primary"
              size="md"
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  {mode === "add" ? "Menambah..." : "Menyimpan..."}
                </span>
              ) : (
                <>
                  {mode === "add" ? (
                    <>
                      <UserPlusIcon className="w-4 h-4 mr-2" />
                      Tambah User
                    </>
                  ) : (
                    <>
                      <PencilIcon className="w-4 h-4 mr-2" />
                      Simpan Perubahan
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
