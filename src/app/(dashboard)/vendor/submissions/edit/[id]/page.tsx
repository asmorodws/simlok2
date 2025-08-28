import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import EditSubmissionForm from '../../../../../../components/vendor/EditSubmissionForm';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { prisma } from '@/lib/prisma';

interface EditSubmissionPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditSubmissionPage({ params }: EditSubmissionPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'VENDOR') {
    redirect('/admin');
  }

  // Await params as required by Next.js 15
  const { id } = await params;

  return (
    <SidebarLayout title="Vendor Panel" titlePage="Ubah Pengajuan SIMLOK">
      <div className="space-y-6">
      
        
        <EditSubmissionForm submissionId={id} />
      </div>
    </SidebarLayout>
  );
}
