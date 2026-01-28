import { Metadata } from "next";
import { DashboardPageHelpers, createDashboardMetadata } from "@/lib/helpers/dashboardPageHelper";
import RoleDashboard from "@/components/features/dashboard/RoleDashboard";

export const metadata: Metadata = createDashboardMetadata(
  "Dashboard Reviewer",
  "Halaman dashboard untuk reviewer mengelola review pengajuan Simlok"
);

export default function ReviewerPage() {
  return DashboardPageHelpers.reviewer(<RoleDashboard role="REVIEWER" />);
}