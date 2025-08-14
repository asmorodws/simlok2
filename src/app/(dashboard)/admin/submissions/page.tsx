import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/lib/auth';
import RoleGate from '@/components/RoleGate';
import SidebarLayout from '@/components/SidebarLayout';
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
