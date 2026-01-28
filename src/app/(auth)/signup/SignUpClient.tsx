"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import SignUpForm from "@/components/features/auth/SignUpForm";
import AuthRedirect from "@/components/features/auth/AuthRedirect";
import { normalizePhoneNumber } from "@/utils/formatter/phoneNumber";

export default function SignUpClient() {
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
    if (!email || !password || !confirmPassword || !nama_petugas || !nama_vendor || !alamat || !no_telp) {
      setError("Semua field harus diisi");
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
          phone_number: normalizePhoneNumber(no_telp.trim()),
          turnstile_token: turnstileToken,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan saat mendaftar");
      } else {
        // Registration successful!
        console.log("✅ Registration successful!", data);
        
        // Auto-login after registration
        // Use skip_turnstile flag because Turnstile token was already used during signup
        console.log("🔄 Auto-login after registration...");
        
        const signInResult = await signIn("credentials", {
          redirect: false,
          email: email.trim().toLowerCase(),
          password: password,
          skip_turnstile: "true", // Skip Turnstile - already validated during signup
        });

        console.log("🔍 SignIn result:", signInResult);

        if (signInResult?.error) {
          console.error("❌ Auto-login failed:", signInResult.error);
          setError("Pendaftaran berhasil! Namun terjadi kesalahan saat login otomatis. Silakan login manual.");
          setTimeout(() => {
            router.push("/login");
          }, 2000);
        } else if (signInResult?.ok) {
          console.log("✅ Auto-login successful!");
          console.log("⏳ Waiting for session to be ready...");
          
          // Wait a bit for session to be properly set before redirecting
          // This ensures server-side session check will succeed
          setTimeout(() => {
            console.log("🔄 Redirecting to verification-pending...");
            router.push("/verification-pending");
          }, 1000); // 1 second delay to ensure session is set
        } else {
          console.warn("⚠️ SignIn returned unexpected result:", signInResult);
          setError("Pendaftaran berhasil! Silakan login manual.");
          setTimeout(() => {
            router.push("/login");
          }, 2000);
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
