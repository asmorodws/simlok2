import RoleGate from "@/components/RoleGate";
import SidebarLayout from "@/components/SidebarLayout";
import DashboardMainContent from "@/components/DashboardMainContent";

export default function VendorPage() {
  return (
    <RoleGate allowedRoles={["VENDOR"]}>
      <SidebarLayout title="Vendor Panel">
        <DashboardMainContent />
      </SidebarLayout>
    </RoleGate>
  );
}