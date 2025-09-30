"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
// Import role types
import { redirect } from "next/navigation";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import UserVerificationManagement from "@/components/reviewer/UserVerificationManagement";
import PageLoader from "@/components/ui/PageLoader";

export default function UserVerificationPage() {
  const { data: session, status } = useSession();
  
  // State untuk refresh tabel
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
    <RoleGate allowedRoles={["REVIEWER", "SUPER_ADMIN"]}>
      <SidebarLayout title="Reviewer Panel" titlePage="Verifikasi User">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200/70">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Verifikasi User
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Kelola dan verifikasi user vendor dalam sistem
                  </p>
                </div>
              </div>
            </div>

            {/* User Verification Management Component */}
            <div className="p-6">
              <UserVerificationManagement refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </div>
      </SidebarLayout>
    </RoleGate>
  );
}