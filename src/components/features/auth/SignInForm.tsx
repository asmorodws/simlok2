"use client";
import React, { useState, useRef } from "react";
import type { FC } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";
import { Turnstile } from "next-turnstile";

import Input from "@/components/ui/input/Input";
import Label from "@/components/ui/form/Label";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/hooks/useToast";

interface Props {
  email: string;
  password: string;
  showPassword: boolean;
  error: string;
  isLoading: boolean;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setShow: (v: boolean) => void;
  handleSubmit: (e: React.FormEvent, turnstileToken?: string) => void;
}

/**
 * Catatan:
 * - Untuk field password, gunakan <input> native agar tidak double ikon mata.
 *   (Beberapa komponen Input kustom punya toggle bawaan. Dengan native input, kita kontrol penuh.)
 */
const SignInForm: FC<Props> = ({
  email,
  password,
  showPassword,
  error,
  isLoading,
  setEmail,
  setPassword,
  setShow,
  handleSubmit,
}) => {
  const [pwdFocused, setPwdFocused] = useState(false);
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
      showWarning("Verifikasi Diperlukan", "Harap verifikasi bahwa Anda bukan robot sebelum melanjutkan.");
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
          <div className="text-center w-full" style={{ marginTop: "-10rem" }}>
            <div className="mb-15 flex w-full bg-white p-5 justify-center">
              <Image
                src="/assets/logo.svg"
                alt="Logo SIMLOK"
                width={200}
                height={90}
                className="object-contain drop-shadow-lg"
                priority
              />
            </div>

            <h1 className="text-6xl font-bold mb-6 tracking-wide text-white">
              SIMLOK
            </h1>
            <p className="text-xl text-white font-light tracking-wide leading-relaxed">
              Surat Izin Masuk Lokasi
            </p>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 lg:p-12 bg-white min-h-screen">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image
              src="/assets/logo.svg"
              alt="Logo SIMLOK"
              width={300}
              height={300}
              className="object-contain"
              priority
            />
          </div>

          <div className="w-full">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Masuk ke SIMLOK
              </h1>
              <p className="text-gray-600">Masukkan email dan password Anda</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <Label className="text-gray-700 font-medium text-sm" htmlFor="email">
                  Alamat Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="masukkan@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className="mt-2 h-12 px-4 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                />
              </div>

              {/* Password — gunakan native input untuk hindari double eye icon */}
              <div>
                <Label className="text-gray-700 font-medium text-sm" htmlFor="password">
                  Kata Sandi <span className="text-red-500">*</span>
                </Label>
                <div className={`relative mt-2 ${pwdFocused ? "ring-1 ring-blue-500 rounded-lg" : ""}`}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPwdFocused(true)}
                    onBlur={() => setPwdFocused(false)}
                    required
                    autoComplete="current-password"
                    className="block w-full h-12 px-4 pr-12 text-base rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!showPassword)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

            {/* Turnstile CAPTCHA */}
              <div className="flex justify-center mt-6">
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
                    // showSuccess("Verifikasi Berhasil", "Verifikasi keamanan berhasil. Anda dapat melanjutkan login.");
                  }}
                />
              </div>



              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg"
                type="submit"
                disabled={isLoading || turnstileStatus !== "success"}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Masuk...
                  </div>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>
                
            <div className="mt-6 pt-6 border-t border-gray-200">
              
              <p className="text-center text-gray-600 text-sm">
                Belum memiliki akun?{" "}
                <Link href="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
                  Daftar sebagai Vendor
                </Link>
              </p>
            </div>
          </div>
  
          {/* Footer (opsional) */}
          {/* <div className="mt-8 text-center text-xs text-gray-500">
            <p>© 2025 Pertamina. Seluruh hak cipta dilindungi.</p>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default SignInForm;
