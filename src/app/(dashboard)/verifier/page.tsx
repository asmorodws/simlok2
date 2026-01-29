import { Metadata } from "next";
import { createDashboardMetadata } from "@/lib/helpers/dashboardPageHelper";
import RoleDashboard from "@/components/features/dashboard/RoleDashboard";
import DashboardPageTemplate from "@/components/templates/DashboardPageTemplate";

export const metadata: Metadata = createDashboardMetadata(
  "Dashboard Verifikator",
  "Halaman dashboard untuk verifikator mengelola dan memverifikasi pengajuan"
);

export default function VerifierPage() {
  return (
    <DashboardPageTemplate
      allowedRoles={['VERIFIER', 'SUPER_ADMIN']}
      sidebarTitle="Dashboard Verifikasi"
      titlePage="Verifier"
    >
      <RoleDashboard role="VERIFIER" />
    </DashboardPageTemplate>
  );
}