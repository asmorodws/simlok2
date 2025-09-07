import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can access this endpoint
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get statistics for all submissions (no filters)
    const [total, statistics] = await Promise.all([
      prisma.submission.count(),
      prisma.submission.groupBy({
        by: ['approval_status'],
        _count: {
          approval_status: true
        }
      })
    ]);

    const stats = {
      total: total,
      pending: statistics.find(s => s.approval_status === 'PENDING')?._count.approval_status || 0,
      approved: statistics.find(s => s.approval_status === 'APPROVED')?._count.approval_status || 0,
      rejected: statistics.find(s => s.approval_status === 'REJECTED')?._count.approval_status || 0,
    };

    return NextResponse.json({
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
