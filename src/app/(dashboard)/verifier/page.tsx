import RoleGate from "@/components/RoleGate";
import SidebarLayout from "@/components/SidebarLayout";
import DashboardMainContent from "@/components/DashboardMainContent";

export default function VerifierPage() {
  return (
    <RoleGate allowedRoles={["VERIFIER"]}>
      <SidebarLayout title="Verifier Panel" titlePage="Dashboard">
        <DashboardMainContent />
      </SidebarLayout>
    </RoleGate>
  );
}