import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import VerifierDashboard from "@/components/dashboard/VerifierDashboard";

export default function VerifierPage() {
  return (
    <RoleGate allowedRoles={["VERIFIER"]}>
      <SidebarLayout title="Verifier Panel" titlePage="Dashboard">
        <VerifierDashboard />
      </SidebarLayout>
    </RoleGate>
  );
}