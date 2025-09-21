import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';

// GET /api/admin/submissions - Get all submissions for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN or SUPER_ADMIN can access this endpoint
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const vendorName = searchParams.get('vendor');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    // Filter by status if provided
    if (status) {
      whereClause.approval_status = status;
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

    // Filter by vendor name if provided (legacy support)
    if (vendorName && !search) {
      whereClause.vendor_name = {
        contains: vendorName,
        mode: 'insensitive'
      };
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
          approved_by_user: {
            select: {
              id: true,
              officer_name: true,
              email: true,
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.submission.count({ where: whereClause }),
      // Get statistics
      prisma.submission.groupBy({
        by: ['approval_status'],
        _count: {
          approval_status: true
        }
      })
    ]);

    // Format statistics
    const stats = {
      total: total,
      pending: statistics.find(s => s.approval_status === 'PENDING')?._count.approval_status || 0,
      approved: statistics.find(s => s.approval_status === 'APPROVED')?._count.approval_status || 0,
      rejected: statistics.find(s => s.approval_status === 'REJECTED')?._count.approval_status || 0,
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
    console.error('Error fetching admin submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
