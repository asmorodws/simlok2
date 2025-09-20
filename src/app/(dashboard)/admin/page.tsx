import { Metadata } from "next";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

export const metadata: Metadata = {
  title: "Dashboard Admin - SIMLOK",
  description: "Halaman dashboard untuk administrator mengelola sistem dan pengguna",
};

export default function AdminPage() {
  return (
    <RoleGate allowedRoles={["ADMIN"]}>
      <SidebarLayout title="Admin Panel" titlePage="Dashboard">
        <AdminDashboard />
      </SidebarLayout>
    </RoleGate>
  );
}