import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { SubmissionData } from '@/types/submission';
import { notifyAdminNewSubmission } from '@/server/events';

// GET /api/submissions - Get all submissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const vendorName = searchParams.get('vendor');
    const includeStats = searchParams.get('stats') === 'true';
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    // Filter by role
    if (session.user.role === 'VENDOR') {
      whereClause.user_id = session.user.id;
    }

    // Filter by status if provided
    if (status) {
      whereClause.approval_status = status;
    }

    // Filter by vendor name if provided (admin/verifier only)
    if (vendorName && session.user.role !== 'VENDOR') {
      whereClause.vendor_name = {
        contains: vendorName
      };
    }

    // Add search functionality
    if (search) {
      const searchConditions = [
        { vendor_name: { contains: search } },
        { officer_name: { contains: search } },
        { job_description: { contains: search } },
        { work_location: { contains: search } },
        { worker_names: { contains: search } }
      ];
      
      whereClause.OR = searchConditions;
    }

    // Prepare orderBy
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              officer_name: true,
              email: true,
              vendor_name: true,
            }
          },
          approved_by_user: {
            select: {
              id: true,
              officer_name: true,
              email: true,
            }
          }
        },
        orderBy: orderBy,
        skip,
        take: limit,
      }),
      prisma.submission.count({ where: whereClause }),
    ]);

    const response: any = {
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    };

    // Include statistics for admin requests
    if (includeStats && session.user.role === 'ADMIN') {
      const statistics = await prisma.submission.groupBy({
        by: ['approval_status'],
        _count: {
          approval_status: true
        }
      });

      response.statistics = {
        total: total,
        pending: statistics.find(s => s.approval_status === 'PENDING')?._count.approval_status || 0,
        approved: statistics.find(s => s.approval_status === 'APPROVED')?._count.approval_status || 0,
        rejected: statistics.find(s => s.approval_status === 'REJECTED')?._count.approval_status || 0,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/submissions - Create new submission
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Debug logging
    console.log('POST /api/submissions - Session user:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role
    });

    // Only VENDOR can create submissions
    if (session.user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Only vendors can create submissions' }, { status: 403 });
    }

    const body: SubmissionData = await request.json();
    
    // Debug logging for received data
    console.log('POST /api/submissions - Received data:', {
      ...body,
      // Don't log sensitive data, just check if required fields exist
      hasRequiredFields: {
        vendor_name: !!body.vendor_name,
        based_on: !!body.based_on,
        officer_name: !!body.officer_name,
        job_description: !!body.job_description,
        work_location: !!body.work_location,
        working_hours: !!body.working_hours,
        work_facilities: !!body.work_facilities,
        worker_names: !!body.worker_names
      }
    });

    // Validate required fields
    const requiredFields = [
      'vendor_name', 'based_on', 'officer_name', 'job_description', 
      'work_location', 'working_hours', 'work_facilities', 'worker_names'
    ];

    for (const field of requiredFields) {
      if (!body[field as keyof SubmissionData]) {
        console.log(`POST /api/submissions - Missing required field: ${field}`);
        return NextResponse.json({ 
          error: `Field ${field} is required` 
        }, { status: 400 });
      }
    }

    // Validate session user ID
    if (!session.user.id) {
      console.log('POST /api/submissions - Session user ID is missing');
      return NextResponse.json({ 
        error: 'User ID not found in session' 
      }, { status: 400 });
    }

    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!userExists) {
      console.log('POST /api/submissions - User not found in database:', session.user.id);
      return NextResponse.json({ 
        error: 'User not found in database' 
      }, { status: 400 });
    }

    console.log('POST /api/submissions - User verified:', userExists.email);

    // Extract workers data and remove it from body since it's not part of Submission model
    const { workers, ...submissionData } = body as any;

    // Generate QR Code (simple implementation)
    const qrData = `${session.user.id}-${Date.now()}`;
    
    try {
      // Create submission first
      const submission = await prisma.submission.create({
        data: {
          ...submissionData,
          user_id: session.user.id,
          worker_count: submissionData.worker_count || null,
          simja_date: submissionData.simja_date ? new Date(submissionData.simja_date) : null,
          sika_date: submissionData.sika_date ? new Date(submissionData.sika_date) : null,
          qrcode: qrData,
        },
        include: {
          user: {
            select: {
              id: true,
              officer_name: true,
              email: true,
              vendor_name: true,
            }
          }
        }
      });

      // Create workers if they exist
      if (workers && Array.isArray(workers) && workers.length > 0) {
        const workersData = workers.map((worker: any) => ({
          worker_name: worker.worker_name,
          worker_photo: worker.worker_photo || null,
          submission_id: submission.id,
        }));

        await prisma.workerList.createMany({
          data: workersData,
        });

        console.log('POST /api/submissions - Workers created:', workersData.length);
      }

      // Notify admin about new submission
      await notifyAdminNewSubmission(submission.id);

      console.log('POST /api/submissions - Submission created successfully:', submission.id);
      return NextResponse.json(submission, { status: 201 });
    } catch (dbError) {
      console.error('POST /api/submissions - Database error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to create submission in database' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('POST /api/submissions - General error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
