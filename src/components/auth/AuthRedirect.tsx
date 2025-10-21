"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AuthRedirect({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // If we're still loading session or already redirecting, do nothing
    if (status === "loading" || isRedirecting) return;

    // If the current URL contains a session_expired flag (e.g. redirected from middleware)
    // we must not auto-redirect away from the login page. Reading search params via
    // next/navigation hooks can require Suspense and cause blank pages when used here
    // (because AuthRedirect wraps the Suspense area). So we read window.location safely.
    let hasSessionExpired = false;
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        hasSessionExpired = url.searchParams.get('session_expired') === 'true';
      }
    } catch (e) {
      // ignore - fallback to false
      hasSessionExpired = false;
    }

    // If session_expired is present, do not redirect (we want to show the login form and message)
    if (hasSessionExpired) return;

    // If the session is authenticated, redirect based on role.
    if (status === "authenticated" && session?.user?.role) {
      setIsRedirecting(true);

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
          router.replace("/"); // fallback
      }
    }
  }, [session, status, router, isRedirecting]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
          <p>Memuat...</p>
        </div>
      </div>
    );
  }

  // Don't render anything while redirecting to prevent flash of login form
  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
          <p>Mengalihkan...</p>
        </div>
      </div>
    );
  }

  // Hanya render children kalau user TIDAK terautentikasi.
  return <>{status !== "authenticated" ? children : null}</>;
}