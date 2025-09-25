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
    const reviewStatus = searchParams.get('reviewStatus');
    const finalStatus = searchParams.get('finalStatus');
    const vendorId = searchParams.get('vendorId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    // Filter by review status if provided
    if (reviewStatus && ['PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'].includes(reviewStatus)) {
      whereClause.review_status = reviewStatus;
    }

    // Filter by final status if provided
    if (finalStatus && ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'].includes(finalStatus)) {
      whereClause.final_status = finalStatus;
    } else if (!finalStatus) {
      // Default to showing only pending approval submissions if no final status filter is applied
      whereClause.final_status = 'PENDING_APPROVAL';
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

    const [submissions, total, statistics, userStats] = await Promise.all([
      prisma.submission.findMany({
        where: whereClause,
        select: {
          id: true,
          approval_status: true,
          review_status: true,
          final_status: true,
          vendor_name: true,
          based_on: true,
          officer_name: true,
          job_description: true,
          work_location: true,
          implementation: true,
          working_hours: true,
          other_notes: true,
          work_facilities: true,
          created_at: true,
          user: {
            select: {
              id: true,
              vendor_name: true,
              officer_name: true,
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
      }),
      // Get user verification statistics
      Promise.all([
        prisma.user.count({
          where: { 
            role: 'VENDOR',
            verified_at: null 
          }
        }),
        prisma.user.count({
          where: { 
            role: 'VENDOR',
            verified_at: { not: null }
          }
        })
      ])
    ]);

    // Format statistics for frontend
    const [pendingUserVerifications, totalVerifiedUsers] = userStats;
    const stats = {
      total: total,
      pendingReview: statistics.find(s => s.review_status === 'PENDING_REVIEW')?._count.review_status || 0,
      meetsRequirements: statistics.find(s => s.review_status === 'MEETS_REQUIREMENTS')?._count.review_status || 0,
      notMeetsRequirements: statistics.find(s => s.review_status === 'NOT_MEETS_REQUIREMENTS')?._count.review_status || 0,
      pendingUserVerifications,
      totalVerifiedUsers
    };

    return NextResponse.json({
      submissions,
      stats,
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