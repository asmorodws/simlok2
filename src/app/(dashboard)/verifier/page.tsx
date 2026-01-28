import { Metadata } from "next";
import { DashboardPageHelpers, createDashboardMetadata } from "@/lib/helpers/dashboardPageHelper";
import RoleDashboard from "@/components/features/dashboard/RoleDashboard";

export const metadata: Metadata = createDashboardMetadata(
  "Dashboard Verifikator",
  "Halaman dashboard untuk verifikator mengelola dan memverifikasi pengajuan"
);

export default function VerifierPage() {
  return DashboardPageHelpers.verifier(<RoleDashboard role="VERIFIER" />);
}