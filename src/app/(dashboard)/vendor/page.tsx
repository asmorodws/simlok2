import { Metadata } from "next";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import VendorDashboard from "@/components/vendor/VendorDashboard";

export const metadata: Metadata = {
  title: "Dashboard Vendor - SIMLOK",
  description: "Halaman dashboard untuk vendor mengelola pengajuan dan melihat status pengajuan",
};

export default function VendorPage() {
  return (
    <RoleGate allowedRoles={["VENDOR"]}>
      <SidebarLayout title="Dashboard Vendor" titlePage="Vendor">
        <VendorDashboard />
      </SidebarLayout>
    </RoleGate>
  );
}