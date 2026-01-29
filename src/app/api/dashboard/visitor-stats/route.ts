/**
 * @deprecated Use /api/dashboard/stats instead
 * This endpoint redirects to the unified stats endpoint
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';
import cache, { CacheKeys } from '@/lib/cache/cache';
import { requireSessionWithRole } from '@/lib/auth/roleHelpers';
import { dashboardService } from '@/services/DashboardService';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(
      session,
      ['VISITOR', 'SUPER_ADMIN'],
      'Only visitors and super admins can access this dashboard'
    );
    if (userOrError instanceof NextResponse) return userOrError;

    // Check cache first
    const cachedData = cache.get(CacheKeys.VISITOR_STATS);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    // Get stats via service
    const stats = await dashboardService.getVisitorStats();

    // Cache the response
    cache.set(CacheKeys.VISITOR_STATS, stats);

    return NextResponse.json(stats, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('[VISITOR_DASHBOARD_STATS] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
