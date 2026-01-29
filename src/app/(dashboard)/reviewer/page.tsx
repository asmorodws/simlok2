import { Metadata } from "next";
import { createDashboardMetadata } from "@/lib/helpers/dashboardPageHelper";
import RoleDashboard from "@/components/features/dashboard/RoleDashboard";
import DashboardPageTemplate from "@/components/templates/DashboardPageTemplate";

export const metadata: Metadata = createDashboardMetadata(
  "Dashboard Reviewer",
  "Halaman dashboard untuk reviewer mengelola review pengajuan Simlok"
);

export default function ReviewerPage() {
  return (
    <DashboardPageTemplate
      allowedRoles={['REVIEWER', 'SUPER_ADMIN']}
      sidebarTitle="Dashboard Review"
      titlePage="Reviewer"
    >
      <RoleDashboard role="REVIEWER" />
    </DashboardPageTemplate>
  );
}