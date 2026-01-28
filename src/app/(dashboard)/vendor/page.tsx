import { Metadata } from "next";
import { DashboardPageHelpers, createDashboardMetadata } from "@/lib/helpers/dashboardPageHelper";
import RoleDashboard from "@/components/features/dashboard/RoleDashboard";

export const metadata: Metadata = createDashboardMetadata(
  "Dashboard Vendor",
  "Halaman dashboard untuk vendor mengelola pengajuan dan melihat status pengajuan"
);

export default function VendorPage() {
  return DashboardPageHelpers.vendor(<RoleDashboard role="VENDOR" />);
}