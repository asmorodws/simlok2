import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/lib/auth';
import SubmissionForm from '@/components/submissions/SubmissionForm';
import RoleGate from '@/components/RoleGate';
import SidebarLayout from '@/components/SidebarLayout';

export default async function CreateSubmissionPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'VENDOR') {
    redirect('/');
  }

  return (
    <RoleGate allowedRoles={["VENDOR"]}>
      <SidebarLayout title="Vendor Panel" titlePage="Buat Pengajuan Baru">
        <SubmissionForm />
      </SidebarLayout>
    </RoleGate>
  );
}
