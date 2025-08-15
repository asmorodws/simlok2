import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/lib/auth';
import EditSubmissionForm from '../../../../../../components/vendor/EditSubmissionForm';
import SidebarLayout from '@/components/SidebarLayout';
import { prisma } from '@/app/lib/prisma';

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

  // Fetch submission data
  const submission = await prisma.submission.findFirst({
    where: {
      id: id,
      userId: session.user.id, // Ensure user owns this submission
    },
  });

  if (!submission) {
    redirect('/vendor/submissions');
  }

  // Check if submission is still editable (PENDING status)
  if (submission.status_approval_admin !== 'PENDING') {
    redirect('/vendor/submissions');
  }

  return (
    <SidebarLayout title="Vendor Panel" titlePage="Edit Pengajuan SIMLOK">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Pengajuan SIMLOK</h1>
          <p className="mt-1 text-sm text-gray-600">
            Edit detail pengajuan Surat Izin Masuk Lokasi (SIMLOK)
          </p>
        </div>
        
        <EditSubmissionForm submission={submission} />
      </div>
    </SidebarLayout>
  );
}
