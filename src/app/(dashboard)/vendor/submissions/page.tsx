import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/lib/auth';
import RoleGate from '@/components/RoleGate';
import SidebarLayout from '@/components/SidebarLayout';
import VendorSubmissionsContent from '@/components/vendor/VendorSubmissionsContent';
import VerificationGuard from '@/components/VerificationGuard';

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
