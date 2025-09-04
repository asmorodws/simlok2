import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Params {
  id: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get submission - allow admin/verifier to access any submission, vendor only their own
    let submission;
    
    if (session.user.role === 'ADMIN' || session.user.role === 'VERIFIER') {
      submission = await prisma.submission.findUnique({
        where: { id: id }
      });
    } else {
      submission = await prisma.submission.findFirst({
        where: {
          id: id,
          user_id: session.user.id
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
