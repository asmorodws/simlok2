import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET /api/admin/submissions - Get all submissions for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can access this endpoint
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const vendorName = searchParams.get('vendor');
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    // Filter by status if provided
    if (status) {
      whereClause.status_approval_admin = status;
    }

    // Filter by vendor name if provided
    if (vendorName) {
      whereClause.nama_vendor = {
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
              nama_petugas: true,
              email: true,
              nama_vendor: true,
            }
          },
          approvedByUser: {
            select: {
              id: true,
              nama_petugas: true,
              email: true,
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.submission.count({ where: whereClause }),
      // Get statistics
      prisma.submission.groupBy({
        by: ['status_approval_admin'],
        _count: {
          status_approval_admin: true
        }
      })
    ]);

    // Format statistics
    const stats = {
      total: total,
      pending: statistics.find(s => s.status_approval_admin === 'PENDING')?._count.status_approval_admin || 0,
      approved: statistics.find(s => s.status_approval_admin === 'APPROVED')?._count.status_approval_admin || 0,
      rejected: statistics.find(s => s.status_approval_admin === 'REJECTED')?._count.status_approval_admin || 0,
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
