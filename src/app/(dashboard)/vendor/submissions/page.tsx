import { Metadata } from "next";
import { DashboardPageHelpers, createDashboardMetadata } from "@/lib/helpers/dashboardPageHelper";
import VendorSubmissionsContent from '@/components/features/submission/VendorSubmissionsContent';

export const metadata: Metadata = createDashboardMetadata(
  "Daftar Pengajuan - Vendor",
  "Halaman untuk melihat dan mengelola daftar pengajuan vendor"
);

export default function VendorSubmissionsPage() {
  return DashboardPageHelpers.vendor(<VendorSubmissionsContent />);
}
