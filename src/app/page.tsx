// app/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";   // ✅ helper Next-Auth
import { authOptions } from "@/app/lib/auth";  // ✅ kita sudah punya

export default async function Home() {
  const session = await getServerSession(authOptions); // ✅
  if (!session) redirect("/login");

  const { role, verified_at } = session.user;
  
  // Check if user needs verification (except admin)
  if (role !== "ADMIN" && !verified_at) {
    redirect("/verification-pending");
  }

  // Redirect to appropriate dashboard based on role
  if (role === "ADMIN") {
    redirect("/admin");
  } else if (role === "VENDOR") {
    redirect("/vendor");
  } else if (role === "VERIFIER") {
    redirect("/verifier");
  }

  // Fallback redirect to dashboard
  redirect("/dashboard");
}