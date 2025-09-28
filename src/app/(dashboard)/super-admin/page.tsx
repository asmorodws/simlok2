"use client";

import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import SuperAdminDashboard from "@/components/dashboard/SuperAdminDashboard";

export default function SuperAdminPage() {
  return (
    <RoleGate allowedRoles={["SUPER_ADMIN"]}>
      <SidebarLayout title="Super Admin Panel" titlePage="Dashboard">
        <SuperAdminDashboard />
      </SidebarLayout>
    </RoleGate>
  );
}
