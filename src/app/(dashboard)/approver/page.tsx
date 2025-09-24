import { Metadata } from "next";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ApproverSubmissionsManagement from "@/components/approver/ApproverSubmissionsManagement";

export const metadata: Metadata = {
  title: "Dashboard Approver - SIMLOK",
  description: "Halaman dashboard untuk approver mengelola persetujuan pengajuan Simlok",
};

export default function ApproverPage() {
  return (
    <RoleGate allowedRoles={["APPROVER", "ADMIN", "SUPER_ADMIN"]}>
      <SidebarLayout title="Approver Panel" titlePage="Persetujuan Pengajuan">
        <ApproverSubmissionsManagement />
      </SidebarLayout>
    </RoleGate>
  );
}