import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/security/auth';
import { redirect } from 'next/navigation';
import RoleGate from '@/components/security/RoleGate';
import SidebarLayout from '@/components/layout/SidebarLayout';
import VerifierScanHistory from '@/components/verifier/VerifierScanHistory';

export const metadata: Metadata = {
  title: 'Riwayat Scan - Verifier',
  description: 'Riwayat scan QR code SIMLOK oleh verifier',
};

export default async function VerifierHistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'VERIFIER') {
    redirect('/dashboard');
  }

  return (
    <RoleGate allowedRoles={["VERIFIER"]}>
      <SidebarLayout title="Riwayat Scan" titlePage="Verifier">
        <VerifierScanHistory />
      </SidebarLayout>
    </RoleGate>
  );
}