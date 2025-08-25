import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import SubmissionForm from '@/components/submissions/SubmissionForm';
import RoleGate from '@/components/security/RoleGate';
import SidebarLayout from '@/components/layout/SidebarLayout';
import VerificationGuard from '@/components/security/VerificationGuard';

export default async function CreateSubmissionPage() {
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
        <SidebarLayout title="Vendor Panel" titlePage="Buat Pengajuan Baru">
          <SubmissionForm />
        </SidebarLayout>
      </RoleGate>
    </VerificationGuard>
  );
}
