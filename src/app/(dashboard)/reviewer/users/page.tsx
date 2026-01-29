"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import DashboardPageTemplate from "@/components/templates/DashboardPageTemplate";
import UserManagementPageTemplate from "@/components/templates/UserManagementPageTemplate";
import UnifiedUserVerificationManagement from "@/components/features/user/UnifiedUserVerificationManagement";
import { PageLoader } from "@/components/ui/loading";

export default function UserVerificationPage() {
  const { data: session, status } = useSession();
  const [refreshTrigger] = useState(0);

  // Loading state
  if (status === "loading") {
    return <PageLoader message="Memuat halaman verifikasi user..." fullScreen={false} />;
  }

  // Redirect if not authenticated or not authorized
  if (!session || !["REVIEWER", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  return (
    <DashboardPageTemplate
      allowedRoles={["REVIEWER", "SUPER_ADMIN"]}
      sidebarTitle="Verifikasi User"
      titlePage="Reviewer"
    >
      <UserManagementPageTemplate
        title="Verifikasi User"
        description="Kelola dan verifikasi user vendor dalam sistem"
      >
        <UnifiedUserVerificationManagement role="REVIEWER" refreshTrigger={refreshTrigger} />
      </UserManagementPageTemplate>
    </DashboardPageTemplate>
  );
}