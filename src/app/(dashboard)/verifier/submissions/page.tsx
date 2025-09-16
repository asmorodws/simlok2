import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RoleGate from '@/components/security/RoleGate';
import SidebarLayout from '@/components/layout/SidebarLayout';
import SubmissionsList from '@/components/verifier/SubmissionsList';

export const metadata: Metadata = {
  title: 'Daftar SIMLOK - Verifier',
  description: 'Daftar semua submission SIMLOK untuk verifier',
};

export default async function VerifierSubmissionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'VERIFIER') {
    redirect('/dashboard');
  }

  return (
    <RoleGate allowedRoles={["VERIFIER"]}>
      <SidebarLayout title="Daftar SIMLOK" titlePage="Verifier">
        <SubmissionsList />
      </SidebarLayout>
    </RoleGate>
  );
}
