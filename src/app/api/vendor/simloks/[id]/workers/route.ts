/**
 * GET /api/vendor/simloks/[id]/workers
 * Get workers for a vendor's own submission
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/singletons';
import { 
  withErrorHandling, 
  apiSuccess, 
  apiError,
  getAuthenticatedSession,
  handleOptions,
} from '@/lib/api-utils';

async function getVendorSubmissionWorkers(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Check authentication
  const { session, error: authError } = await getAuthenticatedSession();
  if (authError) return authError;

  // Only vendors can access this endpoint
  if (session.user.role !== 'VENDOR') {
    return apiError('Access denied', 403);
  }

  // Check if submission belongs to this vendor
  const submission = await prisma.submission.findFirst({
    where: {
      id: id,
      user_id: session.user.id,
    },
  });

  if (!submission) {
    return apiError('Submission not found', 404);
  }

  // Get workers
  const workers = await prisma.workerList.findMany({
    where: {
      submission_id: id,
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  return apiSuccess({ workers });
}

export const GET = withErrorHandling(getVendorSubmissionWorkers);
export const OPTIONS = handleOptions;