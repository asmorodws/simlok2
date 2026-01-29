"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/loading";

interface Props {
  allowedRoles: ("SUPER_ADMIN" | "VENDOR" | "VERIFIER" | "REVIEWER" | "APPROVER" | "VISITOR")[];
  requireVerification?: boolean; // Optional: require user to be verified
  children: React.ReactNode;
}

/**
 * RoleGate - Simple role-based access control
 * 
 * Features:
 * - Check if user is authenticated
 * - Check if user has correct role
 * - Optional: check if user is verified
 * - Auto-redirect if unauthorized
 * 
 * Middleware already validates session against database,
 * so this component just checks role and verification status
 */
export default function RoleGate({ allowedRoles, requireVerification = true, children }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    
    // No session? Redirect to login
    if (!session) {
      router.replace("/login");
      return;
    }
    
    // Account rejected? Redirect to rejection page
    if (session.user.verification_status === "REJECTED") {
      router.replace("/verification-rejected");
      return;
    }
    
    // Not verified? Redirect to pending page (except super admin)
    if (requireVerification && 
        session.user.role !== "SUPER_ADMIN" && 
        session.user.role !== "REVIEWER" && 
        session.user.role !== "APPROVER" && 
        !session.user.verified_at) {
      router.replace("/verification-pending");
      return;
    }
    
    // Wrong role? Redirect to home
    if (!allowedRoles.includes(session.user.role)) {
      router.replace("/");
      return;
    }
  }, [session, status, allowedRoles, requireVerification, router]);

  // Show loadingx
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }
  
  // Don't render if unauthorized (redirect will happen)
  if (!session || 
      session.user.verification_status === "REJECTED" ||
      !allowedRoles.includes(session.user.role) ||
      (requireVerification && 
       session.user.role !== "SUPER_ADMIN" && 
       session.user.role !== "REVIEWER" && 
       session.user.role !== "APPROVER" && 
       !session.user.verified_at)) {
    return null;
  }

  return <>{children}</>;
}