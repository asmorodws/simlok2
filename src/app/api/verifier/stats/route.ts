import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/security/auth';
import { prisma } from '@/lib/database';
import { withUserCache } from '@/lib/api/server';
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
        'X-Cache': cached ? 'HIT' : 'MISS'
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
  // Get today's date range
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  // Fetch stats in parallel
  const [
    totalScans,
    todayScans,
    totalSubmissions,
    approvedSubmissions,
    pendingSubmissions,
    rejectedSubmissions
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
      
      // Total submissions
      prisma.submission.count(),
      
      // Approved submissions
      prisma.submission.count({
        where: {
          approval_status: 'APPROVED'
        }
      }),
      
      // Pending submissions
      prisma.submission.count({
        where: {
          approval_status: 'PENDING_APPROVAL'
        }
      }),
      
      // Rejected submissions
      prisma.submission.count({
        where: {
          approval_status: 'REJECTED'
        }
      })
    ]);

  return {
    totalScans,
    todayScans,
    totalSubmissions,
    approvedSubmissions,
    pendingSubmissions,
    rejectedSubmissions
  };
}