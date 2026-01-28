"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import SignInForm from "@/components/features/auth/SignInForm";
import { clearOldSessions } from "@/utils/security/sessionUtils";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShow] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shouldCheckSession, setShouldCheckSession] = useState(true);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Set document title
  useEffect(() => {
    document.title = 'Masuk - SIMLOK';
  }, []);

  // Check for session expired message and disable auto-redirect if present
  useEffect(() => {
    // Read query params directly from window.location to avoid Suspense/renderer issues
    try {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const sessionExpired = url.searchParams.get('session_expired');
      const reason = url.searchParams.get('reason');

      if (sessionExpired === 'true') {
        // Disable session check to prevent redirect loop
        setShouldCheckSession(false);
        
        // Clear all sessions aggressively to prevent redirect loops
        clearOldSessions();

        if (reason) {
          // reason may be encoded when included in redirect URL
          try {
            setError(decodeURIComponent(reason));
          } catch (e) {
            setError(reason);
          }
        } else {
          setError('Sesi Anda telah berakhir. Silakan login kembali.');
        }

        // Clean up URL to remove session_expired params (prevents refresh issues)
        url.searchParams.delete('session_expired');
        url.searchParams.delete('reason');
        url.searchParams.delete('callbackUrl');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      // ignore malformed URL
    }
  }, []);

  // Auto-redirect if already authenticated (unless we disabled it due to session_expired)
  useEffect(() => {
    if (!shouldCheckSession || status === "loading") return;
    
    if (status === "authenticated" && session?.user?.role) {
      console.log('User already authenticated, redirecting based on role:', session.user.role);
      
      switch (session.user.role) {
        case "VENDOR":
          router.replace("/vendor");
          break;
        case "VERIFIER":
          router.replace("/verifier");
          break;
        case "REVIEWER":
          router.replace("/reviewer");
          break;
        case "APPROVER":
          router.replace("/approver");
          break;
        case "SUPER_ADMIN":
          router.replace("/super-admin");
          break;
        case "VISITOR":
          router.replace("/visitor");
          break;
        default:
          router.replace("/dashboard");
      }
    }
  }, [session, status, shouldCheckSession, router]);

  // Show loading state while checking session (but only if we're not showing an error)
  if (status === "loading" && shouldCheckSession && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
          {/* <p>Memeriksa sesi...</p> */}
        </div>
      </div>
    );
  }

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
  );
}
