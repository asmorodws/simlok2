import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/singletons";
import { withUserCache } from "@/lib/api-cache";
import { CacheTTL } from "@/lib/cache";

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

    // Get submission statistics for current vendor
    const stats = await prisma.submission.groupBy({
      by: ['approval_status'],
      where: { user_id: userId },
      _count: {
        approval_status: true
      }
    });

    // Get total count
    const totalCount = await prisma.submission.count({
      where: { user_id: userId }
    });

  // Format statistics
  return {
    totalSubmissions: totalCount,
    pendingSubmissions: stats.find(s => s.approval_status === 'PENDING_APPROVAL')?._count.approval_status || 0,
    approvedSubmissions: stats.find(s => s.approval_status === 'APPROVED')?._count.approval_status || 0,
    rejectedSubmissions: stats.find(s => s.approval_status === 'REJECTED')?._count.approval_status || 0,
    draftSubmissions: 0, // Assuming no draft status in current schema
    totalApproved: stats.find(s => s.approval_status === 'APPROVED')?._count.approval_status || 0,
    totalPending: stats.find(s => s.approval_status === 'PENDING_APPROVAL')?._count.approval_status || 0,
    totalRejected: stats.find(s => s.approval_status === 'REJECTED')?._count.approval_status || 0
  };
}
