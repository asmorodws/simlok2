import { Metadata } from "next";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ReviewerSubmissionsManagement from "@/components/reviewer/ReviewerSubmissionsManagement";

export const metadata: Metadata = {
  title: "Dashboard Reviewer - SIMLOK",
  description: "Halaman dashboard untuk reviewer mengelola review pengajuan Simlok",
};

export default function ReviewerPage() {
  return (
    <RoleGate allowedRoles={["REVIEWER", "ADMIN", "SUPER_ADMIN"]}>
      <SidebarLayout title="Reviewer Panel" titlePage="Review Pengajuan">
        <ReviewerSubmissionsManagement />
      </SidebarLayout>
    </RoleGate>
  );
}