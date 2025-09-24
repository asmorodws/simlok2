import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';

// GET /api/approver/simloks - Get reviewed submissions for approval
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only APPROVER, ADMIN, or SUPER_ADMIN can access this endpoint
    if (!['APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Approver access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const reviewStatus = searchParams.get('reviewStatus');
    const vendorId = searchParams.get('vendorId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'reviewed_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const skip = (page - 1) * limit;

    const whereClause: any = {
      // Only show submissions that have been reviewed (not pending review)
      review_status: {
        not: 'PENDING_REVIEW'
      }
    };

    // Filter by specific review status if provided
    if (reviewStatus && ['MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'].includes(reviewStatus)) {
      whereClause.review_status = reviewStatus;
    }

    // Filter by vendor if provided
    if (vendorId) {
      whereClause.user_id = vendorId;
    }

    // Filter by search term (vendor name, job description, or officer name)
    if (search) {
      whereClause.OR = [
        {
          vendor_name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          job_description: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          officer_name: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const [submissions, total, statistics] = await Promise.all([
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
          reviewed_by_user: {
            select: {
              id: true,
              officer_name: true,
              email: true,
            }
          },
          approved_by_final_user: {
            select: {
              id: true,
              officer_name: true,
              email: true,
            }
          },
          worker_list: {
            select: {
              id: true,
              worker_name: true,
              worker_photo: true,
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.submission.count({ where: whereClause }),
      // Get statistics for approver dashboard
      Promise.all([
        prisma.submission.count({
          where: {
            review_status: 'MEETS_REQUIREMENTS',
            final_status: 'PENDING_APPROVAL'
          }
        }),
        prisma.submission.count({
          where: {
            review_status: 'NOT_MEETS_REQUIREMENTS',
            final_status: 'PENDING_APPROVAL'
          }
        }),
        prisma.submission.count({
          where: {
            final_status: 'APPROVED'
          }
        }),
        prisma.submission.count({
          where: {
            final_status: 'REJECTED'
          }
        }),
      ])
    ]);

    // Format statistics
    const [meetsCount, notMeetsCount, approvedCount, rejectedCount] = statistics;
    const stats = {
      total: total,
      pending_approval_meets: meetsCount,
      pending_approval_not_meets: notMeetsCount,
      approved: approvedCount,
      rejected: rejectedCount,
    };

    return NextResponse.json({
      submissions,
      statistics: stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('Error fetching approver submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}