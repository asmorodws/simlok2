import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { withUserCache } from "@/lib/api-cache";
import { CacheTTL } from "@/lib/cache";
import DashboardService from "@/services/DashboardService";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "VENDOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Use user-specific cache
    const { data: vendorStats, cached } = await withUserCache(
      'vendor:stats',
      userId,
      CacheTTL.ONE_MINUTE,
      async () => {
        return await fetchVendorStats(userId);
      }
    );

    return NextResponse.json(vendorStats, {
      headers: {
        'X-Cache': cached ? 'HIT' : 'MISS'
      }
    });

  } catch (error) {
    console.error("Vendor dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function fetchVendorStats(userId: string) {
  // Get vendor statistics from service
  const stats = await DashboardService.getVendorStats(userId);

  // Format for legacy compatibility
  return {
    totalSubmissions: stats.total,
    pendingSubmissions: stats.byStatus.PENDING,
    approvedSubmissions: stats.byStatus.APPROVED,
    rejectedSubmissions: stats.byStatus.REJECTED,
    draftSubmissions: 0, // No draft status in current schema
    totalApproved: stats.byStatus.APPROVED,
    totalPending: stats.byStatus.PENDING,
    totalRejected: stats.byStatus.REJECTED
  };
}
