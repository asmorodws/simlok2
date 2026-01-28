import { Metadata } from "next";
import { DashboardPageHelpers, createDashboardMetadata } from "@/lib/helpers/dashboardPageHelper";
import RoleSubmissionsManagement from "@/components/features/submission/management/RoleSubmissionsManagement";

export const metadata: Metadata = createDashboardMetadata(
  "Daftar Pengajuan - Reviewer",
  "Halaman untuk reviewer melihat dan mengelola pengajuan Simlok"
);

export default function ReviewerSubmissionsPage() {
  return DashboardPageHelpers.reviewer(<RoleSubmissionsManagement role="REVIEWER" />);
}