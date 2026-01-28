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
    if (status === "loading" || isRedirecting) return;

    // Check if we're on login/signup page with session_expired flag
    let hasSessionExpired = false;
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        hasSessionExpired = url.searchParams.get('session_expired') === 'true';
      }
    } catch (e) {
      hasSessionExpired = false;
    }

    if (hasSessionExpired) return;

    // If authenticated, redirect based on verification and role
    if (status === "authenticated" && session?.user) {
      setIsRedirecting(true);
      
      // Check if user is rejected
      if (session.user.verification_status === 'REJECTED') {
        router.replace("/verification-rejected");
        return;
      }
      
      // Check if user needs verification (except super admin, reviewer, approver)
      if (!session.user.verified_at && 
          session.user.role !== 'SUPER_ADMIN' && 
          session.user.role !== 'REVIEWER' && 
          session.user.role !== 'APPROVER') {
        router.replace("/verification-pending");
        return;
      }

      // User is verified, redirect to dashboard
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
          router.replace("/");
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

  // Show redirecting state
  if (isRedirecting) {
    return null; // Don't show anything while redirecting
  }

  // Only render children if NOT authenticated
  return <>{status !== "authenticated" ? children : null}</>;
}