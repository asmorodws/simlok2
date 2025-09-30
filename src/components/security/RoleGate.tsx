"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  allowedRoles: ("SUPER_ADMIN" | "VENDOR" | "VERIFIER" | "REVIEWER" | "APPROVER")[];
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

  if (status === "loading") return <p className="p-8">Loading…</p>;
  if (!session || !allowedRoles.includes(session.user.role)) return null;

  return <>{children}</>;
}