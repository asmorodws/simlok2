import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import DashboardMainContent from "@/components/dashboard/DashboardMainContent";

export default function VerifierPage() {
  return (
    <RoleGate allowedRoles={["VERIFIER"]}>
      <SidebarLayout title="Verifier Panel" titlePage="Dashboard">
        <DashboardMainContent />
      </SidebarLayout>
    </RoleGate>
  );
}