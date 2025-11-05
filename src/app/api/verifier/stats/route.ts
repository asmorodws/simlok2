import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withUserCache } from '@/lib/api-cache';
import { CacheTTL } from '@/lib/cache';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'VERIFIER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use user-specific cache (2 minutes since scans change frequently)
    const { data: stats, cached } = await withUserCache(
      'verifier:stats',
      session.user.id,
      CacheTTL.ONE_MINUTE * 2, // 2 minutes cache
      async () => {
        return await fetchVerifierStats(session.user.id);
      }
    );

    return NextResponse.json(stats, {
      headers: {
        'X-Cache': cached ? 'HIT' : 'MISS',
        'Cache-Control': 'private, max-age=120',  // 2 minutes cache for verifier stats
      }
    });

  } catch (error) {
    console.error('Error fetching verifier stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function fetchVerifierStats(userId: string) {
  // Get today's date range (Jakarta timezone)
  const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const today = new Date(jakartaNow);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  // Fetch stats in parallel
  const [
    totalScans,
    todayScans,
    submissionStats,
    totalSubmissions
  ] = await Promise.all([
    // Total scans by this verifier
    prisma.qrScan.count({
      where: {
        scanned_by: userId
      }
    }),
    
    // Today's scans by this verifier
    prisma.qrScan.count({
      where: {
        scanned_by: userId,
        scanned_at: {
          gte: todayStart,
          lt: todayEnd
        }
      }
    }),
    
    // OPTIMIZED: Use groupBy for submission stats
    prisma.submission.groupBy({
      by: ['approval_status'],
      _count: { id: true }
    }),
    
    // Total submissions count
    prisma.submission.count()
  ]);

  // Convert groupBy results to object
  const statsByStatus = submissionStats.reduce((acc, curr) => {
    acc[curr.approval_status] = curr._count.id;
    return acc;
  }, {} as Record<string, number>);

  const approvedSubmissions = statsByStatus.APPROVED || 0;
  const pendingSubmissions = statsByStatus.PENDING_APPROVAL || 0;
  const rejectedSubmissions = statsByStatus.REJECTED || 0;

  return {
    totalScans,
    todayScans,
    totalSubmissions,
    approvedSubmissions,
    pendingSubmissions,
    rejectedSubmissions
  };
}