import { Metadata } from "next";
import { DashboardPageHelpers, createDashboardMetadata } from "@/lib/helpers/dashboardPageHelper";
import RoleDashboard from "@/components/features/dashboard/RoleDashboard";

export const metadata: Metadata = createDashboardMetadata(
  "Dashboard Approver",
  "Halaman dashboard untuk approver mengelola persetujuan pengajuan Simlok"
);

export default function ApproverPage() {
  return DashboardPageHelpers.approver(<RoleDashboard role="APPROVER" />);
}