import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import cache, { CacheKeys, CacheTTL } from "@/lib/cache";
import { toJakartaISOString } from '@/lib/timezone';
import { DashboardService } from "@/services/DashboardService";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has appropriate privileges for visitor dashboard
    if (!['VISITOR', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check cache first
    const cachedData = cache.get(CacheKeys.VISITOR_STATS);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'private, max-age=60',
        }
      });
    }

    // Use DashboardService to get visitor stats
    const dashboardStats = await DashboardService.getVisitorStats();

    const response = {
      success: true,
      timestamp: toJakartaISOString(new Date()) || new Date().toISOString(),
      ...dashboardStats
    };

    // Cache the response for 1 minute
    cache.set(CacheKeys.VISITOR_STATS, response, CacheTTL.ONE_MINUTE);

    return NextResponse.json(response, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=60',
      }
    });

  } catch (error) {
    console.error("[VISITOR_DASHBOARD_STATS] Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: "Internal Server Error", 
        message: errorMessage,
        timestamp: toJakartaISOString(new Date()) || new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}