import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { SubmissionData } from '@/types';
import { rateLimiter, RateLimitPresets, getRateLimitHeaders } from '@/lib/rate-limiter';
import { logger, getRequestMetadata } from '@/lib/logger';
import { Session } from 'next-auth';
import { SubmissionService } from '@/services/SubmissionService';

// GET /api/submissions - Get all submissions
export async function GET(request: NextRequest) {
  let session;
  try {
    session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const reviewStatus = searchParams.get('reviewStatus');
    const approvalStatus = searchParams.get('finalStatus');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const vendorName = searchParams.get('vendor');
    const includeStats = searchParams.get('stats') === 'true';

    // Use SubmissionService to get submissions with proper role-based filtering
    const result = await SubmissionService.getSubmissions({
      userId: session.user.id,
      role: session.user.role as any,
      page,
      limit,
      ...(status && { status }),
      ...(reviewStatus && { reviewStatus }),
      ...(approvalStatus && { approvalStatus }),
      ...(search && { search }),
      sortBy,
      sortOrder,
      ...(vendorName && { vendorName }),
      includeStats,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('API:Submissions:GET', 'Error fetching submissions', error, {
      userId: session?.user?.id,
      role: session?.user?.role,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/submissions - Create new submission
export async function POST(request: NextRequest) {
  const { ip, userAgent } = getRequestMetadata(request);
  let session: Session | null = null;
  
  try {
    session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.warn('API:Submissions:POST', 'Unauthorized submission attempt', { ip, userAgent });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('API:Submissions:POST', 'Submission request started', {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      ip,
    });

    // Only VENDOR can create submissions
    if (session.user.role !== 'VENDOR') {
      logger.warn('API:Submissions:POST', 'Non-vendor attempted to create submission', {
        userId: session.user.id,
        role: session.user.role,
      });
      return NextResponse.json({ error: 'Only vendors can create submissions' }, { status: 403 });
    }

    // ========== RATE LIMITING ==========
    // Prevent spam: 5 submissions per 5 minutes per vendor
    const rateLimitResult = rateLimiter.check(
      `submission:${session.user.id}`,
      RateLimitPresets.submission
    );

    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult);
      logger.warn('API:Submissions:POST', 'Rate limit exceeded', {
        userId: session.user.id,
        email: session.user.email,
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

    const body: SubmissionData = await request.json();
    const bodyWithDocs = body as any;

    logger.debug('API:Submissions:POST', 'Processing submission data', {
      userId: session.user.id,
      hasImplementationDates: !!(body.implementation_start_date && body.implementation_end_date),
    });

    // Validate required fields (use Indonesian error messages and friendly labels)
    const requiredFields: (keyof SubmissionData)[] = [
      'vendor_name', 'officer_name', 'job_description',
      'work_location', 'working_hours', 'work_facilities', 'worker_names'
    ];

    const fieldLabels: Record<string, string> = {
      vendor_name: 'Nama Vendor',
      officer_name: 'Nama Petugas',
      job_description: 'Deskripsi Pekerjaan',
      work_location: 'Lokasi Kerja',
      working_hours: 'Jam Kerja',
      work_facilities: 'Sarana Kerja',
      worker_names: 'Daftar Pekerja'
    };

    for (const field of requiredFields) {
      if (!body[field]) {
        const label = fieldLabels[field] || field;
        logger.warn('API:Submissions:POST', 'Required field missing', {
          userId: session.user.id,
          missingField: field,
          label,
        });
        return NextResponse.json({
          error: `Field wajib: ${label} harus diisi`,
          field: field
        }, { status: 400 });
      }
    }

    // Validate session user ID
    if (!session.user.id) {
      logger.error('API:Submissions:POST', 'Session user ID is missing', null, {
        sessionData: session.user,
      });
      return NextResponse.json({
        error: 'User ID not found in session'
      }, { status: 400 });
    }

    // Verify user exists in database and get user data
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!userExists) {
      logger.error('API:Submissions:POST', 'User not found in database', null, {
        userId: session.user.id,
      });
      return NextResponse.json({
        error: 'User not found in database'
      }, { status: 400 });
    }

    logger.info('API:Submissions:POST', 'User verified', {
      userId: userExists.id,
      email: userExists.email,
    });

    // Prepare data for service
    const submissionData: any = {
      ...bodyWithDocs,
      user_id: session.user.id,
      user_email: userExists.email,
      user_officer_name: userExists.officer_name,
      user_vendor_name: userExists.vendor_name,
      user_phone_number: userExists.phone_number,
      user_address: userExists.address,
      vendor_phone: userExists.phone_number,
    };

    // Use SubmissionService to create submission
    const submission = await SubmissionService.createSubmission(submissionData);

    logger.info('API:Submissions:POST', 'Submission created successfully', {
      userId: session.user.id,
      submissionId: submission.id,
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    logger.apiError(
      'API:Submissions:POST',
      'Unexpected error while creating submission',
      error,
      {
        userId: session?.user?.id,
        ip,
        userAgent,
      }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
