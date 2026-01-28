import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/singletons';
import { requireSessionWithRole } from '@/lib/auth/roleHelpers';

interface Params {
  id: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, ['VENDOR', 'REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN']);
    if (userOrError instanceof NextResponse) return userOrError;

    const { id } = await params;

    // Get submission - allow admin/reviewer/approver to access any submission, vendor only their own
    let submission;
    
    if (['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'APPROVER'].includes(userOrError.role)) {
      submission = await prisma.submission.findUnique({
        where: { id: id }
      });
    } else {
      submission = await prisma.submission.findFirst({
        where: {
          id: id,
          user_id: userOrError.id
        }
      });
    }

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Get workers for this submission
    const workers = await prisma.workerList.findMany({
      where: {
        submission_id: id
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    return NextResponse.json({ workers });
  } catch (error) {
    console.error('Error fetching workers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
