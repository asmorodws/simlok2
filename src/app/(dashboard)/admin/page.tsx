import RoleGate from "@/components/RoleGate";
import SidebarLayout from "@/components/SidebarLayout";
import DashboardMainContent from "@/components/DashboardMainContent";

export default function AdminPage() {
  return (
    <RoleGate allowedRoles={["ADMIN"]}>
      <SidebarLayout title="Admin Panel">
        <DashboardMainContent />
      </SidebarLayout>
    </RoleGate>
  );
}