import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';

// GET /api/reviewer/simloks - Get submissions for reviewer dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only REVIEWER, ADMIN, or SUPER_ADMIN can access this endpoint
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Reviewer access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const reviewStatus = searchParams.get('status');
    const vendorId = searchParams.get('vendorId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const skip = (page - 1) * limit;

    const whereClause: any = {
      // Only show submissions that haven't been finalized yet
      final_status: 'PENDING_APPROVAL'
    };

    // Filter by review status if provided
    if (reviewStatus && ['PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'].includes(reviewStatus)) {
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
      // Get statistics for reviewer dashboard
      prisma.submission.groupBy({
        by: ['review_status'],
        where: {
          final_status: 'PENDING_APPROVAL'
        },
        _count: {
          review_status: true
        }
      })
    ]);

    // Format statistics
    const stats = {
      total: total,
      pending_review: statistics.find(s => s.review_status === 'PENDING_REVIEW')?._count.review_status || 0,
      meets_requirements: statistics.find(s => s.review_status === 'MEETS_REQUIREMENTS')?._count.review_status || 0,
      not_meets_requirements: statistics.find(s => s.review_status === 'NOT_MEETS_REQUIREMENTS')?._count.review_status || 0,
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
    console.error('Error fetching reviewer submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}