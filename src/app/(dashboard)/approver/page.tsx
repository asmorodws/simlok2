import { Metadata } from "next";
import { createDashboardMetadata } from "@/lib/helpers/dashboardPageHelper";
import RoleDashboard from "@/components/features/dashboard/RoleDashboard";
import DashboardPageTemplate from "@/components/templates/DashboardPageTemplate";

export const metadata: Metadata = createDashboardMetadata(
  "Dashboard Approver",
  "Halaman dashboard untuk approver mengelola persetujuan pengajuan Simlok"
);

export default function ApproverPage() {
  return (
    <DashboardPageTemplate
      allowedRoles={['APPROVER', 'SUPER_ADMIN']}
      sidebarTitle="Dashboard Persetujuan"
      titlePage="Approver"
    >
      <RoleDashboard role="APPROVER" />
    </DashboardPageTemplate>
  );
}