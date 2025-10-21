// src/app/(auth)/signup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import AuthRedirect from "@/components/auth/AuthRedirect";
import SignUpForm from "@/components/auth/SignUpForm";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nama_petugas, setNamaPetugas] = useState("");
  const [nama_vendor, setNamaVendor] = useState("");
  const [alamat, setAlamat] = useState("");
  const [no_telp, setNoTelp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const validateForm = () => {
    if (!nama_petugas.trim()) {
      setError("Nama petugas harus diisi");
      return false;
    }
    if (!email.trim()) {
      setError("Email harus diisi");
      return false;
    }
    if (!no_telp.trim()) {
      setError("Nomor telepon harus diisi");
      return false;
    }
    if (!alamat.trim()) {
      setError("Alamat harus diisi");
      return false;
    }
    if (!nama_vendor.trim()) {
      setError("Nama vendor harus diisi");
      return false;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak sama");
      return false;
    }
    if (!agreed) {
      setError("Anda harus menyetujui syarat dan ketentuan");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent, turnstileToken?: string) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          officer_name: nama_petugas.trim(),
          email: email.trim().toLowerCase(),
          password,
          vendor_name: nama_vendor.trim(),
          address: alamat.trim(),
          phone_number: no_telp.trim(),
          turnstile_token: turnstileToken,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan saat mendaftar");
      } else {
        // Registration successful! Now auto-login the user
        console.log("Registration successful, auto-logging in...");
        
        // Use NextAuth signIn to create a session
        const signInResult = await signIn("credentials", {
          redirect: false, // Don't auto-redirect, we'll handle it manually
          email: email.trim().toLowerCase(),
          password: password,
        });

        if (signInResult?.error) {
          console.error("Auto-login failed:", signInResult.error);
          // Even if auto-login fails, still inform user registration was successful
          setError("Pendaftaran berhasil! Namun terjadi kesalahan saat login otomatis. Silakan login manual.");
          // Redirect to login page after 2 seconds
          setTimeout(() => {
            router.push("/login");
          }, 2000);
        } else {
          // Auto-login successful! Redirect to verification-pending
          console.log("Auto-login successful, redirecting to verification-pending");
          router.push("/verification-pending");
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthRedirect>
      <SignUpForm
        email={email}
        password={password}
        confirmPassword={confirmPassword}
        nama_petugas={nama_petugas}
        nama_vendor={nama_vendor}
        alamat={alamat}
        no_telp={no_telp}
        showPassword={showPassword}
        showConfirmPassword={showConfirmPassword}
        agreeToTerms={agreed}
        error={error}
        isLoading={isLoading}
        setEmail={setEmail}
        setPassword={setPassword}
        setConfirmPassword={setConfirmPassword}
        setNamaPetugas={setNamaPetugas}
        setNamaVendor={setNamaVendor}
        setAlamat={setAlamat}
        setNoTelp={setNoTelp}
        setShowPassword={setShowPassword}
        setShowConfirmPassword={setShowConfirmPassword}
        setAgree={setAgreed}
        handleSubmit={handleSubmit}
      />
    </AuthRedirect>
  );
}