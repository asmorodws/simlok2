import { Metadata } from "next";
import { createDashboardMetadata } from "@/lib/helpers/dashboardPageHelper";
import RoleDashboard from "@/components/features/dashboard/RoleDashboard";
import DashboardPageTemplate from "@/components/templates/DashboardPageTemplate";

export const metadata: Metadata = createDashboardMetadata(
  "Dashboard Vendor",
  "Halaman dashboard untuk vendor mengelola pengajuan dan melihat status pengajuan"
);

export default function VendorPage() {
  return (
    <DashboardPageTemplate
      allowedRoles={['VENDOR']}
      sidebarTitle="Dashboard Vendor"
      titlePage="Vendor"
    >
      <RoleDashboard role="VENDOR" />
    </DashboardPageTemplate>
  );
}