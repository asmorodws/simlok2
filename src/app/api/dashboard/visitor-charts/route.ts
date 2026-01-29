import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import cache, { CacheKeys, CacheTTL } from '@/lib/cache/cache';
import { requireSessionWithRole } from '@/lib/auth/roleHelpers';
import { dashboardService } from '@/services/DashboardService';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, ['VISITOR', 'ADMIN', 'SUPER_ADMIN']);
    if (userOrError instanceof NextResponse) return userOrError;

    // Check cache first
    const cachedData = cache.get(CacheKeys.VISITOR_CHARTS);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'private, max-age=300',
        },
      });
    }

    // Get charts data via service
    const chartData = await dashboardService.getVisitorCharts();

    // Cache for 5 minutes
    cache.set(CacheKeys.VISITOR_CHARTS, chartData, CacheTTL.FIVE_MINUTES);

    return NextResponse.json(chartData, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error fetching visitor charts data:', error);
    return NextResponse.json({ error: 'Failed to fetch charts data' }, { status: 500 });
  }
}
