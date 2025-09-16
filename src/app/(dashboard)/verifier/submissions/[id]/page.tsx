import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import RoleGate from '@/components/security/RoleGate';
import SidebarLayout from '@/components/layout/SidebarLayout';
import SubmissionDetail from '@/components/verifier/SubmissionDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Detail SIMLOK - ${id}`,
    description: 'Detail submission SIMLOK untuk verifier',
  };
}

export default async function VerifierSubmissionDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'VERIFIER') {
    redirect('/dashboard');
  }

  const { id } = await params;

  // Fetch submission data
  const submission = await db.submission.findUnique({
    where: { id: id },
    include: {
      worker_list: {
        select: {
          id: true,
          worker_name: true,
          worker_photo: true
        }
      }
    }
  });

  if (!submission) {
    notFound();
  }

  return (
    <RoleGate allowedRoles={["VERIFIER"]}>
      <SidebarLayout title={`SIMLOK ${submission.simlok_number || submission.id}`} titlePage="Detail">
        <SubmissionDetail submission={submission} />
      </SidebarLayout>
    </RoleGate>
  );
}
