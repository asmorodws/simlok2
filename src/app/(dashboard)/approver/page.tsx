import { Metadata } from "next";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ApproverDashboard from "@/components/approver/ApproverDashboard";

export const metadata: Metadata = {
  title: "Dashboard Approver - SIMLOK",
  description: "Halaman dashboard untuk approver mengelola persetujuan pengajuan Simlok",
};

export default function ApproverPage() {
  return (
    <RoleGate allowedRoles={["APPROVER" , "SUPER_ADMIN"]}>
      <SidebarLayout title="Dashboard Persetujuan" titlePage="Approver">
        <ApproverDashboard />
      </SidebarLayout>
    </RoleGate>
  );
}