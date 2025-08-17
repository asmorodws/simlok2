import RoleGate from "@/components/RoleGate";
import SidebarLayout from "@/components/SidebarLayout";
import VendorDashboard from "@/components/VendorDashboard";
import VerificationGuard from "@/components/VerificationGuard";

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