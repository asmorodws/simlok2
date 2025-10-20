"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingSpinner from "../ui/LoadingSpinner";

interface Props {
  allowedRoles: ("SUPER_ADMIN" | "VENDOR" | "VERIFIER" | "REVIEWER" | "APPROVER" | "VISITOR")[];
  children: React.ReactNode;
}

export default function RoleGate({ allowedRoles, children }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.replace("/login");
    else if (!allowedRoles.includes(session.user.role)) router.replace("/"); // Redirect to home if role is not allowed
  }, [session, status, allowedRoles, router]);

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
  
  if (!session || !allowedRoles.includes(session.user.role)) return null;

  return <>{children}</>;
}