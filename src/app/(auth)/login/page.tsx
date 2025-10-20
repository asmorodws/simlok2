"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import AuthRedirect from "@/components/auth/AuthRedirect";
import SignInForm from "@/components/auth/SignInForm";
import { clearOldSessions } from "@/utils/session-utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShow] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for session expired message
  useEffect(() => {
    const sessionExpired = searchParams.get('session_expired');
    const reason = searchParams.get('reason');
    
    if (sessionExpired === 'true') {
      if (reason) {
        setError(decodeURIComponent(reason));
      } else {
        setError('Sesi Anda telah berakhir. Silakan login kembali.');
      }
      
      // Clear old sessions on mount if session expired
      clearOldSessions();
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent, turnstileToken?: string) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        turnstile_token: turnstileToken,
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
          case "ACCOUNT_DEACTIVATED":
            setError("Akun Anda telah dinonaktifkan. Silakan hubungi administrator untuk informasi lebih lanjut.");
            break;
          case "TURNSTILE_FAILED":
            setError("Verifikasi keamanan gagal. Silakan refresh halaman dan coba lagi.");
            break;
          case "TURNSTILE_REQUIRED":
            setError("Verifikasi keamanan diperlukan.");
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
    } catch (error) {
      console.error("Login error:", error);
      setError(error instanceof Error ? error.message : "Terjadi kesalahan saat login. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthRedirect>
      <SignInForm
        email={email}
        password={password}
        showPassword={showPassword}
        error={error}
        isLoading={isLoading}
        setEmail={setEmail}
        setPassword={setPassword}
        setShow={setShow}
        handleSubmit={handleSubmit}
      />
    </AuthRedirect>
  );
}