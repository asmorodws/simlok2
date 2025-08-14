import RoleGate from "@/components/RoleGate";
import SidebarLayout from "@/components/SidebarLayout";
import AdminDashboard from "@/components/AdminDashboard";

export default function AdminPage() {
  return (
    <RoleGate allowedRoles={["ADMIN"]}>
      <SidebarLayout title="Admin Panel" titlePage="Dashboard">
        <AdminDashboard />
      </SidebarLayout>
    </RoleGate>
  );
}