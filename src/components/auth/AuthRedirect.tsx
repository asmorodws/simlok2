"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AuthRedirect({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // tunggu dulu

    // If the session is authenticated, redirect based on role.
    // Avoid relying on optional properties like accessToken which may not be present.
    if (status === "authenticated" && session?.user?.role) {
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
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Hanya render children kalau user TIDAK terautentikasi.
  return <>{status !== "authenticated" ? children : null}</>;
}