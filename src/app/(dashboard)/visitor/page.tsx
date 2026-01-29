import { Metadata } from "next";
import DashboardPageTemplate from "@/components/templates/DashboardPageTemplate";
import RoleDashboard from "@/components/features/dashboard/RoleDashboard";

export const metadata: Metadata = {
  title: "Dashboard Visitor - SIMLOK",
  description: "Halaman dashboard untuk visitor melihat statistik dan informasi sistem SIMLOK",
};

export default function VisitorPage() {
  return (
    <DashboardPageTemplate
      allowedRoles={["VISITOR"]}
      sidebarTitle="Dashboard Visitor"
      titlePage="Dashboard Visitor"
    >
      <RoleDashboard role="VISITOR" />
    </DashboardPageTemplate>
  );
}