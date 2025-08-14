// app/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";   // ✅ helper Next-Auth
import { authOptions } from "@/app/lib/auth";  // ✅ kita sudah punya
import AdminPage from "./(dashboard)/admin/page";
import VendorPage from "./(dashboard)/vendor/page";
import VerifierPage from "./(dashboard)/verifier/page";

export default async function Home() {
  const session = await getServerSession(authOptions); // ✅
  if (!session) redirect("/login");

  const { role } = session.user;

  return (
    <>
      {role === "ADMIN" && <AdminPage />}
      {role === "VENDOR" && <VendorPage />}
      {role === "VERIFIER" && <VerifierPage />}
    </>
  );
}