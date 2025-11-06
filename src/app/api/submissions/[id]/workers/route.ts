import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { responseCache, CacheTTL, CacheTags, generateCacheKey } from '@/lib/response-cache';

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

    // Try cache first (5 min TTL)
    const cacheKey = generateCacheKey('workers-list', {
      submissionId: id,
      userId: session.user.id,
    });

    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get submission - allow admin/reviewer/approver to access any submission, vendor only their own
    let submission;
    
    if (['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'APPROVER'].includes(session.user.role)) {
      submission = await prisma.submission.findUnique({
        where: { id: id },
        select: { id: true, user_id: true } // Only needed fields
      });
    } else {
      submission = await prisma.submission.findFirst({
        where: {
          id: id,
          user_id: session.user.id
        },
        select: { id: true, user_id: true }
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

    const response = NextResponse.json({ workers });

    // Cache the response for 5 minutes
    responseCache.set(
      cacheKey,
      response,
      CacheTTL.LONG, // 5 minutes
      [
        CacheTags.SUBMISSION_DETAIL,
        `submission:${id}`,
        `user:${submission.user_id}`,
      ]
    );

    return response;
  } catch (error) {
    console.error('Error fetching workers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
