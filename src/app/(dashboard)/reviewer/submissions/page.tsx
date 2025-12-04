import { Metadata } from "next";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ReviewerSubmissionsManagement from "@/components/reviewer/ReviewerSubmissionsManagement";

export const metadata: Metadata = {
  title: "Daftar Pengajuan - Reviewer SIMLOK",
  description: "Halaman untuk reviewer melihat dan mengelola pengajuan Simlok",
};

export default function ReviewerSubmissionsPage() {
  return (
    <RoleGate allowedRoles={["REVIEWER", "SUPER_ADMIN"]}>
      <SidebarLayout title="Daftar Pengajuan" titlePage="Reviewer">
        <ReviewerSubmissionsManagement />
      </SidebarLayout>
    </RoleGate>
  );
}