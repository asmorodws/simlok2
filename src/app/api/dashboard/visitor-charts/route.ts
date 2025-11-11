import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import cache, { CacheKeys, CacheTTL } from '@/lib/cache';
import { DashboardService } from '@/services/DashboardService';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check cache first
    const cachedData = cache.get(CacheKeys.VISITOR_CHARTS);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'private, max-age=300', // 5 minutes
        }
      });
    }

    // Use DashboardService to get visitor charts data
    const chartData = await DashboardService.getVisitorCharts();

    // Cache the response for 5 minutes
    cache.set(CacheKeys.VISITOR_CHARTS, chartData, CacheTTL.FIVE_MINUTES);

    return NextResponse.json(chartData, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=300', // 5 minutes
      }
    });
  } catch (error) {
    console.error('Error fetching visitor charts data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch charts data' },
      { status: 500 }
    );
  }
}
