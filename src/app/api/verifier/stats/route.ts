import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withUserCache } from '@/lib/api-cache';
import { CacheTTL } from '@/lib/cache';
import DashboardService from '@/services/DashboardService';

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
      CacheTTL.ONE_MINUTE * 2,
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
  // Get verifier stats from service
  const verifierStats = await DashboardService.getVerifierStats(userId);

  // Get submission counts (these aren't in DashboardService.getVerifierStats)
  const [totalSubmissions, approvedSubmissions, pendingSubmissions, rejectedSubmissions] = await Promise.all([
    prisma.submission.count(),
    prisma.submission.count({ where: { approval_status: 'APPROVED' } }),
    prisma.submission.count({ where: { approval_status: 'PENDING_APPROVAL' } }),
    prisma.submission.count({ where: { approval_status: 'REJECTED' } })
  ]);

  return {
    totalScans: verifierStats.totalScans,
    todayScans: verifierStats.todayScans,
    totalSubmissions,
    approvedSubmissions,
    pendingSubmissions,
    rejectedSubmissions
  };
}