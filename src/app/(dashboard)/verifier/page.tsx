import { Metadata } from "next";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import VerifierDashboard from "@/components/verifier/VerifierDashboard";

export const metadata: Metadata = {
  title: "Dashboard Verifikator - SIMLOK",
  description: "Halaman dashboard untuk verifikator mengelola dan memverifikasi pengajuan",
};

export default function VerifierPage() {
  return (
    <RoleGate allowedRoles={["VERIFIER"]}>
      <SidebarLayout title="Verifier Panel" titlePage="Dashboard">
        <VerifierDashboard />
      </SidebarLayout>
    </RoleGate>
  );
}