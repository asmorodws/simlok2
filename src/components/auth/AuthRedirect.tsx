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

    if (session?.user?.role) {
      switch (session.user.role) {
        case "ADMIN":
          router.replace("/admin");
          break;
        case "VENDOR":
          router.replace("/vendor");
          break;
        case "VERIFIER":
          router.replace("/verifier");
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

  // hanya render children kalau memang BELUM login
  return <>{!session ? children : null}</>;
}