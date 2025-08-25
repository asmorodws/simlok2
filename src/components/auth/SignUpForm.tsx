"use client";

import Checkbox from "@/components/form/Checkbox";
import Input from "@/components/form/Input";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { FC } from "react";

interface Props {
  email: string;
  password: string;
  confirmPassword: string;
  nama_petugas: string;
  nama_vendor: string;
  alamat: string;
  no_telp: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  agreeToTerms: boolean;
  error: string;
  isLoading: boolean;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  setNamaPetugas: (v: string) => void;
  setNamaVendor: (v: string) => void;
  setAlamat: (v: string) => void;
  setNoTelp: (v: string) => void;
  setShowPassword: (v: boolean) => void;
  setShowConfirmPassword: (v: boolean) => void;
  setAgree: (v: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const SignUpForm: FC<Props> = ({
  email,
  password,
  confirmPassword,
  nama_petugas,
  nama_vendor,
  alamat,
  no_telp,
  showPassword,
  showConfirmPassword,
  agreeToTerms,
  error,
  isLoading,
  setEmail,
  setPassword,
  setConfirmPassword,
  setNamaPetugas,
  setNamaVendor,
  setAlamat,
  setNoTelp,
  setShowPassword,
  setShowConfirmPassword,
  setAgree,
  handleSubmit,
}) => (
  <div className="flex flex-col w-full items-center justify-center my-auto min-h-screen bg-blue-900 py-8">
    <div className="flex flex-col justify-center w-full max-w-2xl mx-4 bg-white p-8 border border-gray-200 rounded-lg shadow-lg">
      <div>
        <div className="mb-6">
          <h1 className="mb-2 font-semibold text-gray-800 text-2xl">
            Daftar Akun Vendor
          </h1>
          <p className="text-sm text-gray-500">
            Buat akun vendor untuk mengakses sistem SIMLOK
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Informasi Personal
            </h3>
            
            <div>
              <Label>Nama Lengkap Petugas <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                placeholder="Contoh: Ahmad Budi Santoso"
                value={nama_petugas}
                onChange={(e) => setNamaPetugas(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Nama petugas yang akan bertanggung jawab
              </p>
            </div>

            <div>
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                placeholder="email@perusahaan.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label>No. Telepon <span className="text-red-500">*</span></Label>
              <Input
                type="tel"
                placeholder="08123456789"
                value={no_telp}
                onChange={(e) => setNoTelp(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label>Alamat Lengkap <span className="text-red-500">*</span></Label>
              <textarea
                placeholder="Alamat lengkap perusahaan"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                required
                disabled={isLoading}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Informasi Vendor
            </h3>
            
            <div>
              <Label>Nama Vendor/Perusahaan <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                placeholder="PT. Nama Perusahaan"
                value={nama_vendor}
                onChange={(e) => setNamaVendor(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Security Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Keamanan Akun
            </h3>
            
            <div>
              <Label>Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password (min. 8 karakter)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isLoading}
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-gray-500" />
                  )}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Password minimal 8 karakter, kombinasi huruf, angka dan simbol
              </p>
            </div>

            <div>
              <Label>Konfirmasi Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isLoading}
                />
                <span
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-gray-500" />
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start gap-3 pt-4">
            <Checkbox
              checked={agreeToTerms}
              onChange={setAgree}
              label=""
              disabled={isLoading}
            />
            <span className="text-sm text-gray-700 -mt-1">
              Saya menyetujui{" "}
              <Link href="/terms" className="text-blue-500 hover:text-blue-600 underline">
                Syarat dan Ketentuan
              </Link>{" "}
              serta{" "}
              <Link href="/privacy" className="text-blue-500 hover:text-blue-600 underline">
                Kebijakan Privasi
              </Link>{" "}
              yang berlaku. <span className="text-red-500">*</span>
            </span>
          </div>

          <Button 
            className="w-full" 
            size="md" 
            type="submit"
            disabled={isLoading || !agreeToTerms || password !== confirmPassword}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Mendaftar...
              </div>
            ) : (
              "Daftar Sekarang"
            )}
          </Button>

          {password !== confirmPassword && confirmPassword && (
            <p className="text-sm text-red-600 text-center">
              Password dan konfirmasi password tidak sama
            </p>
          )}
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-center text-gray-700">
            Sudah memiliki akun?{" "}
            <Link href="/login" className="text-blue-500 hover:text-blue-600 font-medium">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default SignUpForm;