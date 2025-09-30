"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthRedirect from "@/components/auth/AuthRedirect";
import SignInForm from "@/components/auth/SignInForm";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShow] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      // Convert NextAuth error codes to user-friendly messages
      switch (res.error) {
        case "CredentialsSignin":
          setError("Email atau password salah");
          break;
        case "ACCOUNT_REJECTED":
          setError("Akun Anda telah ditolak oleh administrator. Silakan hubungi admin untuk informasi lebih lanjut.");
          break;
        case "Configuration":
          setError("Terjadi kesalahan konfigurasi sistem");
          break;
        case "AccessDenied":
          setError("Akses ditolak");
          break;
        case "Verification":
          setError("Token verifikasi tidak valid");
          break;
        default:
          setError("Terjadi kesalahan saat login. Silakan coba lagi.");
          break;
      }
    } else {
      router.push("/");
    }
  }

  return (
    <AuthRedirect>
      <SignInForm
        email={email}
        password={password}
        showPassword={showPassword}
        error={error}
        setEmail={setEmail}
        setPassword={setPassword}
        setShow={setShow}
        handleSubmit={handleSubmit}
      />
    </AuthRedirect>
  );
}