import { Metadata } from "next";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ApproverSubmissionsManagement from "@/components/approver/ApproverSubmissionsManagement";

export const metadata: Metadata = {
  title: "Daftar Pengajuan - Approver SIMLOK",
  description: "Halaman untuk approver melihat dan menyetujui pengajuan Simlok",
};

export default function ApproverSubmissionsPage() {
  return (
    <RoleGate allowedRoles={["APPROVER", "SUPER_ADMIN"]}>
      <SidebarLayout title="Approver Panel" titlePage="Daftar Pengajuan">
        <ApproverSubmissionsManagement />
      </SidebarLayout>
    </RoleGate>
  );
}