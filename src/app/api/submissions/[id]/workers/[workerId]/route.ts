import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/singletons';
import { requireSessionWithRole } from '@/lib/auth/roleHelpers';

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
    const userOrError = requireSessionWithRole(session, ['REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN', 'VERIFIER', 'VENDOR']);
    if (userOrError instanceof NextResponse) return userOrError;

    const { id, workerId } = await params;

    // Verify submission access
    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // VENDOR can only delete workers from their own submissions
    if (userOrError.role === 'VENDOR' && submission.user_id !== userOrError.id) {
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
