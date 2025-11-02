import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/security/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { role } = session.user;

  // Redirect to appropriate role-specific dashboard
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

  // Fallback
  redirect("/login");
}