import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responseCache, CacheTTL, CacheTags, generateCacheKey } from '@/lib/response-cache';
import { parallelQueries } from '@/lib/db-optimizer';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get statistics based on user role
    let whereClause = {};
    
    if (session.user.role === 'VENDOR') {
      whereClause = { user_id: session.user.id };
    } else if (session.user.role === 'REVIEWER') {
      whereClause = {}; // Reviewers can see all submissions
    } else if (session.user.role === 'APPROVER') {
      whereClause = {}; // Approvers can see all submissions
    } else if (['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      whereClause = {}; // Admins can see all submissions
    } else if (session.user.role === 'VERIFIER') {
      whereClause = {}; // Verifiers can see all submissions
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Try cache first (5 min TTL for stats)
    const cacheKey = generateCacheKey('submission-stats', {
      role: session.user.role,
      userId: session.user.role === 'VENDOR' ? session.user.id : 'all',
    });

    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get recent activity timestamps (Jakarta timezone)
    const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const thirtyDaysAgo = new Date(jakartaNow);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const today = new Date(jakartaNow);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Execute all queries in parallel for better performance
    const [
      totalSubmissions,
      submissionsByStatus,
      recentActivity,
      todaySubmissions
    ] = await parallelQueries([
      // Total submissions count
      () => prisma.submission.count({ where: whereClause }),
      
      // Submissions by status
      () => prisma.submission.groupBy({
        by: ['approval_status'],
        where: whereClause,
        _count: { id: true }
      }),
      
      // Recent activity (last 30 days)
      () => prisma.submission.count({
        where: {
          ...whereClause,
          created_at: { gte: thirtyDaysAgo }
        }
      }),
      
      // Today's submissions
      () => prisma.submission.count({
        where: {
          ...whereClause,
          created_at: {
            gte: today,
            lt: tomorrow
          }
        }
      })
    ]);

    // Convert to more readable format
    const statusStats = submissionsByStatus.reduce((acc: Record<string, number>, item: any) => {
      acc[item.approval_status] = item._count.id;
      return acc;
    }, {});

    const statistics = {
      total: totalSubmissions,
      byStatus: {
        PENDING: statusStats.PENDING || 0,
        IN_REVIEW: statusStats.IN_REVIEW || 0,
        APPROVED: statusStats.APPROVED || 0,
        REJECTED: statusStats.REJECTED || 0,
        REVISION_REQUIRED: statusStats.REVISION_REQUIRED || 0
      },
      recentActivity,
      todaySubmissions
    };

    const response = NextResponse.json({ statistics });

    // Cache the response for 5 minutes
    responseCache.set(
      cacheKey,
      response,
      CacheTTL.LONG, // 5 minutes
      [
        CacheTags.SUBMISSION_STATS,
        session.user.role === 'VENDOR' ? `user:${session.user.id}` : CacheTags.DASHBOARD,
      ]
    );

    return response;

  } catch (error) {
    console.error("[SUBMISSIONS_STATS]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}