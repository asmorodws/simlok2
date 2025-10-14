import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';

interface Params {
  id: string;
  workerId: string;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, workerId } = await params;

    // Verify submission access
    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Permission: allow REVIEWER, APPROVER, ADMIN, SUPER_ADMIN, VENDOR (owner) and VERIFIER
    const allowedRoles = ['REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN', 'VERIFIER', 'VENDOR'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (session.user.role === 'VENDOR' && submission.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Find worker and ensure it belongs to submission
    const worker = await prisma.workerList.findUnique({ where: { id: workerId } });
    if (!worker || worker.submission_id !== id) {
      return NextResponse.json({ error: 'Worker not found for this submission' }, { status: 404 });
    }

    await prisma.workerList.delete({ where: { id: workerId } });

    return NextResponse.json({ message: 'Worker deleted' });
  } catch (error) {
    console.error('Error deleting worker:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
