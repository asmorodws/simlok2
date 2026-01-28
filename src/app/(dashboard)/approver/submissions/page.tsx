import { Metadata } from "next";
import { DashboardPageHelpers, createDashboardMetadata } from "@/lib/helpers/dashboardPageHelper";
import RoleSubmissionsManagement from "@/components/features/submission/management/RoleSubmissionsManagement";

export const metadata: Metadata = createDashboardMetadata(
  "Daftar Pengajuan - Approver",
  "Halaman untuk approver melihat dan menyetujui pengajuan Simlok"
);

export default function ApproverSubmissionsPage() {
  return DashboardPageHelpers.approver(<RoleSubmissionsManagement role="APPROVER" />);
}