// app/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";   // ✅ helper Next-Auth
import { authOptions } from "@/lib/auth/auth";  // ✅ kita sudah punya

export default async function Home() {
  const session = await getServerSession(authOptions); // ✅
  if (!session) redirect("/login");

  const { role, verified_at } = session.user;
  
  // Check if user needs verification (except super admin)
  if (role !== "SUPER_ADMIN" && !verified_at) {
    redirect("/verification-pending");
  }

  // Redirect to appropriate dashboard based on role
  if (role === "SUPER_ADMIN") {
    redirect("/super-admin");
  } else if (role === "APPROVER") {
    redirect("/approver");
  } else if (role === "REVIEWER") {
    redirect("/reviewer");
  } else if (role === "VENDOR") {
    redirect("/vendor");
  } else if (role === "VERIFIER") {
    redirect("/verifier");
  } else if (role === "VISITOR") {
    redirect("/visitor");
  }

  // Fallback redirect to dashboard
  redirect("/dashboard");
}