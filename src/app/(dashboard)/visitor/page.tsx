import { Metadata } from "next";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import VisitorDashboard from "@/components/visitor/VisitorDashboard";

export const metadata: Metadata = {
  title: "Dashboard Visitor - SIMLOK",
  description: "Halaman dashboard untuk visitor melihat statistik dan informasi sistem SIMLOK",
};

export default function VisitorPage() {
  return (
    <RoleGate allowedRoles={["VISITOR", "SUPER_ADMIN"]}>
      <SidebarLayout title="Visitor Panel" titlePage="Dashboard">
        <VisitorDashboard />
      </SidebarLayout>
    </RoleGate>
  );
}