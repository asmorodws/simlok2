import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

export default function AdminPage() {
  return (
    <RoleGate allowedRoles={["ADMIN"]}>
      <SidebarLayout title="Admin Panel" titlePage="Dashboard">
        <AdminDashboard />
      </SidebarLayout>
    </RoleGate>
  );
}