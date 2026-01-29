import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, RateLimitPresets, getRateLimitHeaders } from '@/lib/api/rateLimiter';
import { logger } from '@/lib/logging/logger';
import { Session } from 'next-auth';
import { withAuth } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { submissionService } from '@/services/SubmissionService';

// GET /api/submissions - Get all submissions
export const GET = withAuth(async (request: NextRequest, session: Session) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract filters from query params
    const filters: any = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
      includeStats: searchParams.get('stats') === 'true',
    };

    // Only add optional filters if they have values
    const status = searchParams.get('status');
    const reviewStatus = searchParams.get('reviewStatus');
    const finalStatus = searchParams.get('finalStatus');
    const vendorName = searchParams.get('vendor');
    const search = searchParams.get('search');

    if (status) filters.status = status;
    if (reviewStatus) filters.reviewStatus = reviewStatus;
    if (finalStatus) filters.finalStatus = finalStatus;
    if (vendorName) filters.vendorName = vendorName;
    if (search) filters.search = search;

    // Use service to get submissions
    const response = await submissionService.getSubmissions(session, filters);

    return apiSuccess(response);
  } catch (error: any) {
    logger.error('SubmissionsRoute', 'Failed to fetch submissions', error);
    return apiError(error.message || 'Failed to fetch submissions', 500);
  }
});

// POST /api/submissions - Create new submission
export const POST = withAuth(async (request: NextRequest, session: Session) => {
  try {
    // Apply rate limiting for submission creation
    const rateLimitResult = rateLimiter.check(
      `submission:${session.user.id}`,
      RateLimitPresets.submission
    );

    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult);
      logger.warn('SubmissionsRoute', 'Rate limit exceeded', {
        userId: session.user.id,
        retryAfter: rateLimitResult.retryAfter,
      });
      return NextResponse.json(
        { 
          error: RateLimitPresets.submission.message,
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429, headers }
      );
    }

    const body = await request.json();

    // Use service to create submission
    const submission = await submissionService.createSubmission(body, session);

    return NextResponse.json(submission, { status: 201 });
  } catch (error: any) {
    logger.error('SubmissionsRoute', 'Failed to create submission', error);
    
    // Handle specific errors
    if (error.message === 'Only vendors can create submissions') {
      return apiError(error.message, 403);
    }
    
    if (error.message.includes('Field wajib') || error.message.includes('required')) {
      return apiError(error.message, 400);
    }
    
    return apiError(error.message || 'Failed to create submission', 500);
  }
}, { allowedRoles: ['VENDOR'] });
