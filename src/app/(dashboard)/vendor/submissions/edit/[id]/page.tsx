import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/auth';
import UnifiedSubmissionForm from '@/components/features/submission/UnifiedSubmissionForm';
import SidebarLayout from '@/components/layout/SidebarLayout';

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
    <SidebarLayout title="Edit Pengajuan" titlePage="Vendor">
      <div className="space-y-6">
        <UnifiedSubmissionForm mode="edit" submissionId={id} />
      </div>
    </SidebarLayout>
  );
}
