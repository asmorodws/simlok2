import { Metadata } from "next";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ReviewerDashboard from "@/components/reviewer/ReviewerDashboard";

export const metadata: Metadata = {
  title: "Dashboard Reviewer - SIMLOK",
  description: "Halaman dashboard untuk reviewer mengelola review pengajuan Simlok",
};

export default function ReviewerPage() {
  return (
    <RoleGate allowedRoles={["REVIEWER" , "SUPER_ADMIN"]}>
      <SidebarLayout title="Dashboard Review" titlePage="Reviewer">
        <ReviewerDashboard />
      </SidebarLayout>
    </RoleGate>
  );
}