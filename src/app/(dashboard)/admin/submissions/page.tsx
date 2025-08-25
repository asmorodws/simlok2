import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import RoleGate from '@/components/security/RoleGate';
import SidebarLayout from '@/components/layout/SidebarLayout';
import AdminSubmissions from '@/components/admin/SubmissionsManagement';

export default async function AdminSubmissionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <RoleGate allowedRoles={["ADMIN"]}>
      <SidebarLayout title="Admin Panel" titlePage="Kelola Pengajuan">
        <AdminSubmissions />
      </SidebarLayout>
    </RoleGate>
  );
}
