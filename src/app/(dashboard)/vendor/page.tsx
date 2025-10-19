import { Metadata } from "next";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import VendorDashboard from "@/components/vendor/VendorDashboard";
import VerificationGuard from "@/components/security/VerificationGuard";

export const metadata: Metadata = {
  title: "Dashboard Vendor - SIMLOK",
  description: "Halaman dashboard untuk vendor mengelola pengajuan dan melihat status pengajuan",
};

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