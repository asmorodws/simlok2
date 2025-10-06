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
    if (finalStatus && finalStatus.trim()) {
      if (['PENDING_APPROVAL', 'APPROVED', 'REJECTED'].includes(finalStatus)) {
        whereClause.approval_status = finalStatus;
      }
    }
    // Note: If no finalStatus is provided, show all submissions (don't filter by approval_status)

    // Filter by vendor if provided
    if (vendorId) {
      whereClause.user_id = vendorId;
    }

    // Filter by search term (vendor name, job description, or officer name)
    if (search) {
      whereClause.OR = [
        {
          vendor_name: {
            contains: search
          }
        },
        {
          job_description: {
            contains: search
          }
        },
        {
          officer_name: {
            contains: search
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
          vendor_name: true,
          based_on: true,
          officer_name: true,
          job_description: true,
          work_location: true,
          implementation: true,
          working_hours: true,
          other_notes: true,
          work_facilities: true,
          simlok_number: true,
          simlok_date: true,
          created_at: true,
          user: {
            select: {
              vendor_name: true,
              officer_name: true,
            }
          },
          reviewed_by_user: {
            select: {
              officer_name: true,
            }
          },
          qrScans: {
            select: {
              scanned_at: true,
            },
            orderBy: {
              scanned_at: 'desc'
            },
            take: 1
          },
          _count: {
            select: {
              qrScans: true
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
          approval_status: 'PENDING_APPROVAL'
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

    // Format submissions with scan data and remove IDs
    const formattedSubmissions = submissions.map(submission => ({
      approval_status: submission.approval_status,
      review_status: submission.review_status,
      vendor_name: submission.vendor_name,
      based_on: submission.based_on,
      officer_name: submission.officer_name,
      job_description: submission.job_description,
      work_location: submission.work_location,
      implementation: submission.implementation,
      working_hours: submission.working_hours,
      other_notes: submission.other_notes,
      work_facilities: submission.work_facilities,
      simlok_number: submission.simlok_number,
      simlok_date: submission.simlok_date,
      created_at: submission.created_at,
      scan_count: submission._count.qrScans,
      last_scanned_at: submission.qrScans[0]?.scanned_at || null,
      user: {
        vendor_name: submission.vendor_name,
        officer_name: submission.officer_name,
      },
      reviewed_by_user: submission.reviewed_by_user ? {
        officer_name: submission.reviewed_by_user.officer_name,
      } : null,
      // Keep ID for internal operations but don't expose in list view
      id: submission.id
    }));

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
      submissions: formattedSubmissions,
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