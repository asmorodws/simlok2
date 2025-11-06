import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/singletons";
import { responseCache, CacheTTL as ResponseCacheTTL, CacheTags, generateCacheKey } from '@/lib/response-cache';
import { parallelQueries } from '@/lib/db-optimizer';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "VENDOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Try response cache first (5 min TTL for vendor stats)
    const cacheKey = generateCacheKey('vendor-stats', { userId });
    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch stats with parallel queries for better performance
    const [stats, totalCount] = await parallelQueries([
      () => prisma.submission.groupBy({
        by: ['approval_status'],
        where: { user_id: userId },
        _count: {
          approval_status: true
        }
      }),
      () => prisma.submission.count({
        where: { user_id: userId }
      })
    ]);

    // Format statistics
    const vendorStats = {
      totalSubmissions: totalCount,
      pendingSubmissions: stats.find((s: any) => s.approval_status === 'PENDING_APPROVAL')?._count.approval_status || 0,
      approvedSubmissions: stats.find((s: any) => s.approval_status === 'APPROVED')?._count.approval_status || 0,
      rejectedSubmissions: stats.find((s: any) => s.approval_status === 'REJECTED')?._count.approval_status || 0,
      draftSubmissions: 0, // Assuming no draft status in current schema
      totalApproved: stats.find((s: any) => s.approval_status === 'APPROVED')?._count.approval_status || 0,
      totalPending: stats.find((s: any) => s.approval_status === 'PENDING_APPROVAL')?._count.approval_status || 0,
      totalRejected: stats.find((s: any) => s.approval_status === 'REJECTED')?._count.approval_status || 0
    };

    const response = NextResponse.json(vendorStats, {
      headers: {
        'X-Cache': 'MISS'
      }
    });

    // Cache the response for 5 minutes
    responseCache.set(
      cacheKey,
      response,
      ResponseCacheTTL.LONG, // 5 minutes
      [CacheTags.VENDOR_STATS, `user:${userId}`]
    );

    return response;

  } catch (error) {
    console.error("Vendor dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
