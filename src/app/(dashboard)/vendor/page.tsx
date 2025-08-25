import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import VendorDashboard from "@/components/dashboard/VendorDashboard";
import VerificationGuard from "@/components/security/VerificationGuard";

export default function VendorPage() {
  return (
    <VerificationGuard>
      <RoleGate allowedRoles={["VENDOR"]}>
        <SidebarLayout title="Vendor Panel" titlePage="Dashboard">
          <VendorDashboard />
        </SidebarLayout>
      </RoleGate>
    </VerificationGuard>
  );
}