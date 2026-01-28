import { Metadata } from "next";
import { DashboardPageHelpers, createDashboardMetadata } from "@/lib/helpers/dashboardPageHelper";
import RoleDashboard from "@/components/features/dashboard/RoleDashboard";

export const metadata: Metadata = createDashboardMetadata(
  "Dashboard Visitor",
  "Halaman dashboard untuk visitor melihat statistik dan informasi sistem SIMLOK"
);

export default function VisitorPage() {
  return DashboardPageHelpers.visitor(<RoleDashboard role="VISITOR" />);
}