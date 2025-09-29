"use client";

// import Checkbox from "@/components/form/Checkbox";
import Input from "@/components/form/Input";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";
import type { FC } from "react";

interface Props {
  email: string;
  password: string;
  showPassword: boolean;
  error: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setShow: (v: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const SignInForm: FC<Props> = ({
  email,
  password,
  showPassword,
  error,
  setEmail,
  setPassword,
  setShow,
  handleSubmit,
}) => (
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
            Sistem Informasi Manajemen Lokasi Kerja Pertamina
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
          />
        </div>

        <div className="w-full">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Masuk ke SIMLOK
            </h1>
            <p className="text-gray-600">
              Masukkan email dan password Anda
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-gray-700 font-medium text-sm">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="masukkan@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 h-12 px-4 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
              />
            </div>

            <div>
              <Label className="text-gray-700 font-medium text-sm">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 px-4 pr-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShow(!showPassword)}
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

            {/* <div className="flex items-center justify-between">
              <Checkbox
                checked={keepLoggedIn}
                onChange={setKeep}
                label="Tetap masuk"
              />
              <Link
                href="/reset-password"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Lupa password?
              </Link>
            </div> */}

            <Button 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg" 
              type="submit"
            >
              Masuk
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600 text-sm">
              Belum memiliki akun?{" "}
              <Link 
                href="/signup" 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Daftar sebagai Vendor
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        {/* <div className="mt-8 text-center text-xs text-gray-500">
          <p>© 2025 Pertamina. Seluruh hak cipta dilindungi.</p>
        </div> */}
      </div>
    </div>
  </div>
);

export default SignInForm;