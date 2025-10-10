"use client";

import Checkbox from "@/components/form/Checkbox";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/Input";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";
import { Turnstile } from "next-turnstile";
import { useState, useRef } from "react";
import type { FC } from "react";
import { useToast } from "@/hooks/useToast";

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
  handleSubmit: (e: React.FormEvent, turnstileToken?: string) => void;
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
}) => {
  const [turnstileStatus, setTurnstileStatus] = useState<
    "success" | "error" | "expired" | "required"
  >("required");
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const { showError, showWarning } = useToast();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Always check if turnstile is verified (both development and production)
    if (turnstileStatus !== "success" || !turnstileToken) {
      showWarning("Verifikasi Diperlukan", "Harap verifikasi bahwa Anda bukan robot sebelum mendaftar.");
      return;
    }

    // Call the parent handleSubmit with turnstile token
    handleSubmit(e, turnstileToken);
  };

  return (
  <div className="min-h-screen flex">
    {/* Left Section - Welcome & Branding */}
    <div className="hidden lg:flex lg:w-1/2 bg-blue-600 relative">
      <div className="flex flex-col justify-center items-center w-full text-white">
         <div className="text-center w-full" style={{ marginTop: '-10rem' }}>
          <div className="mb-15 flex w-full bg-white p-5 justify-center">
            <Image
              src="/assets/logo.svg"
              alt="Logo SIMLOK"
              width={200}
              height={90}
              className="object-contain drop-shadow-lg"
            />
          </div>
          
          {/* SIMLOK Title */}
          <h1 className="text-6xl font-bold mb-6 tracking-wide text-white">
            SIMLOK
          </h1>
          <p className="text-xl text-white font-light tracking-wide leading-relaxed">
            Surat Izin Masuk Lokasi
          </p>
        </div>
      </div>
    </div>

    {/* Right Section - Sign Up Form */}
    <div className="w-full lg:w-1/2 flex flex-col bg-white h-screen overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center p-4 lg:p-6">
        <div className="w-full max-w-lg mx-auto">
          <div className="lg:hidden flex justify-center mb-6">
            <Image
              src="/assets/logo.svg"
              alt="Logo SIMLOK"
              width={200}
              height={90}
              className="object-contain"
            />
          </div>

          <div className="w-full">
            <div className="mb-4">
              <h1 className="text-lg font-bold text-gray-900 mb-1">Daftar Akun Vendor</h1>
              <p className="text-gray-600 text-xs">
                Lengkapi formulir untuk mendaftar sebagai vendor SIMLOK
              </p>
            </div>

            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-3">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Informasi Petugas</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-700 font-medium text-xs">
                      Nama Petugas <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nama_petugas"
                      name="nama_petugas"
                      type="text"
                      validationMode="letters"
                      value={nama_petugas}
                      onChange={(e) => setNamaPetugas(e.target.value)}
                      placeholder="Ahmad Budi"
                      required
                      disabled={isLoading}
                      className="mt-1 h-11 px-4 text-sm w-full border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700 font-medium text-xs">
                      Alamat Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      validationMode="email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@perusahaan.com"
                      required
                      disabled={isLoading}
                      className="mt-1 h-11 px-4 text-sm w-full border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-700 font-medium text-xs">
                      No. Telepon <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="no_telp"
                      name="no_telp"
                      type="tel"
                      validationMode="numbers"
                      value={no_telp}
                      onChange={(e) => setNoTelp(e.target.value)}
                      placeholder="08123456789"
                      required
                      disabled={isLoading}
                      className="mt-1 h-11 px-4 text-sm w-full border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700 font-medium text-xs">
                      Nama Vendor <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nama_vendor"
                      name="nama_vendor"
                      type="text"
                      value={nama_vendor}
                      onChange={(e) => setNamaVendor(e.target.value)}
                      placeholder="PT. Nama Perusahaan"
                      required
                      disabled={isLoading}
                      className="mt-1 h-11 px-4 text-sm w-full border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-700 font-medium text-xs">
                    Alamat Perusahaan <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    value={alamat}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Validasi alamat: hanya huruf, angka, spasi, koma, titik, tanda hubung
                      if (/^[a-zA-Z0-9\s,./-]*$/.test(value)) {
                        setAlamat(value);
                      }
                    }}
                    placeholder="Jalan, Nomor, Kelurahan, Kecamatan, Kota"
                    required
                    disabled={isLoading}
                    rows={2}
                    className="mt-1 w-full h-24 px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Keamanan Akun</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-700 font-medium text-xs">
                      Kata Sandi <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 karakter"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={isLoading}
                        className="w-full h-11 px-4 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="w-3 h-3" />
                        ) : (
                          <EyeIcon className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-700 font-medium text-xs">
                      Konfirmasi <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Ulangi kata sandi"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        disabled={isLoading}
                        className="w-full h-11 px-4 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="w-3 h-3" />
                        ) : (
                          <EyeIcon className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {password !== confirmPassword && confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">
                    Password tidak sama
                  </p>
                )}
              </div>

              {/* Turnstile CAPTCHA */}
              <div className="flex justify-center pt-2">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  retry="auto"
                  refreshExpired="auto"
                  sandbox={process.env.NODE_ENV === "development"}
                  onError={() => {
                    setTurnstileStatus("error");
                    showError("Verifikasi Gagal", "Verifikasi keamanan gagal. Silakan coba lagi.");
                  }}
                  onExpire={() => {
                    setTurnstileStatus("expired");
                    showWarning("Verifikasi Kadaluarsa", "Verifikasi keamanan telah kadaluarsa. Silakan verifikasi ulang.");
                  }}
                  onLoad={() => {
                    setTurnstileStatus("required");
                  }}
                  onVerify={(token) => {
                    setTurnstileStatus("success");
                    setTurnstileToken(token);
                    // showSuccess("Verifikasi Berhasil", "Verifikasi keamanan berhasil. Anda dapat melanjutkan pendaftaran.");
                  }}
                />
              </div>



              <div className="flex items-start gap-2 pt-3">
                <Checkbox
                  checked={agreeToTerms}
                  onChange={setAgree}
                  label=""
                  disabled={isLoading}
                />
                <span className="text-xs text-gray-700">
                  Saya menyetujui{" "}
                  <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">
                    Syarat dan Ketentuan
                  </Link>{" "}
                  serta{" "}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline">
                    Kebijakan Privasi
                  </Link>{" "}
                  yang berlaku. <span className="text-red-500">*</span>
                </span>
              </div>

              <Button 
                className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-sm disabled:opacity-50" 
                type="submit"
                disabled={isLoading || !agreeToTerms || password !== confirmPassword || turnstileStatus !== "success"}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Mendaftar...
                  </div>
                ) : (
                  "Daftar sebagai Vendor"
                )}
              </Button>
            </form>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-center text-gray-600 text-xs">
                Sudah memiliki akun?{" "}
                <Link 
                  href="/login" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Masuk di sini
                </Link>
              </p>
            </div>
          </div>

          {/* <div className="mt-3 text-center text-xs text-gray-500">
            <p>© 2025 Pertamina. Seluruh hak cipta dilindungi.</p>
          </div> */}
        </div>
      </div>
    </div>
  </div>
  );
};

export default SignUpForm;
