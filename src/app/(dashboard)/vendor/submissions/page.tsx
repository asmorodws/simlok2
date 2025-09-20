import { Metadata } from "next";
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import RoleGate from '@/components/security/RoleGate';

export const metadata: Metadata = {
  title: "Daftar Pengajuan - SIMLOK",
  description: "Halaman untuk melihat dan mengelola daftar pengajuan vendor",
};
import SidebarLayout from '@/components/layout/SidebarLayout';
import VendorSubmissionsContent from '@/components/vendor/VendorSubmissionsContent';
import VerificationGuard from '@/components/security/VerificationGuard';

export default async function VendorSubmissionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'VENDOR') {
    redirect('/');
  }

  // Check verification status on server side
  if (!session.user.verified_at) {
    redirect('/verification-pending');
  }

  return (
    <VerificationGuard>
      <RoleGate allowedRoles={["VENDOR"]}>
        <SidebarLayout title="Vendor Panel" titlePage="Daftar Pengajuan">
          <VendorSubmissionsContent />
        </SidebarLayout>
      </RoleGate>
    </VerificationGuard>
  );
}
