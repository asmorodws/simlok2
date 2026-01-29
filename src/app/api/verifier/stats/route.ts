/**
 * @deprecated Use /api/dashboard/stats instead
 * This endpoint redirects to the unified stats endpoint
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { withUserCache } from '@/lib/cache/apiCache';
import { CacheTTL } from '@/lib/cache/cache';
import { dashboardService } from '@/services/DashboardService';

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
        return await dashboardService.getVerifierStats(session.user.id);
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
