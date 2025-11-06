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

    // Check if user has appropriate privileges for approver dashboard
    if (!['APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Try response cache first (5 min TTL for stats)
    const cacheKey = generateCacheKey('approver-stats', {
      role: session.user.role,
    });

    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const submissionWhereClause = {};

    // Execute all queries in parallel
    const [
      totalSubmissions,
      submissionsByApprovalStatus,
      submissionsByReviewStatus,
      pendingApprovalMeetsCount,
      pendingApprovalNotMeetsCount
    ] = await parallelQueries([
      () => prisma.submission.count({ where: submissionWhereClause }),
      
      () => prisma.submission.groupBy({
        by: ['approval_status'],
        where: submissionWhereClause,
        _count: { id: true }
      }),
      
      () => prisma.submission.groupBy({
        by: ['review_status'],
        where: submissionWhereClause,
        _count: { id: true }
      }),
      
      () => prisma.submission.count({
        where: {
          ...submissionWhereClause,
          approval_status: 'PENDING_APPROVAL',
          review_status: 'MEETS_REQUIREMENTS'
        }
      }),
      
      () => prisma.submission.count({
        where: {
          ...submissionWhereClause,
          approval_status: 'PENDING_APPROVAL',
          review_status: 'NOT_MEETS_REQUIREMENTS'
        }
      })
    ]);

    // Process submission stats
    const approvalStatusStats = submissionsByApprovalStatus.reduce((acc: Record<string, number>, item: any) => {
      acc[item.approval_status] = item._count.id;
      return acc;
    }, {});

    const reviewStatusStats = submissionsByReviewStatus.reduce((acc: Record<string, number>, item: any) => {
      acc[item.review_status] = item._count.id;
      return acc;
    }, {});

    const dashboardStats = {
      total: totalSubmissions,
      pending_approval_meets: pendingApprovalMeetsCount,
      pending_approval_not_meets: pendingApprovalNotMeetsCount,
      approved: approvalStatusStats.APPROVED || 0,
      rejected: approvalStatusStats.REJECTED || 0,
      byApprovalStatus: {
        PENDING: approvalStatusStats.PENDING_APPROVAL || 0,
        IN_REVIEW: approvalStatusStats.IN_REVIEW || 0,
        APPROVED: approvalStatusStats.APPROVED || 0,
        REJECTED: approvalStatusStats.REJECTED || 0,
        REVISION_REQUIRED: approvalStatusStats.REVISION_REQUIRED || 0,
      },
      byReviewStatus: {
        PENDING_REVIEW: reviewStatusStats.PENDING_REVIEW || 0,
        MEETS_REQUIREMENTS: reviewStatusStats.MEETS_REQUIREMENTS || 0,
        NOT_MEETS_REQUIREMENTS: reviewStatusStats.NOT_MEETS_REQUIREMENTS || 0,
      }
    };

    const response = NextResponse.json(dashboardStats, {
      headers: {
        'X-Cache': 'MISS'
      }
    });

    // Cache for 5 minutes
    responseCache.set(
      cacheKey,
      response,
      CacheTTL.LONG,
      [CacheTags.APPROVER_STATS, CacheTags.DASHBOARD]
    );

    return response;

  } catch (error) {
    console.error("[APPROVER_DASHBOARD_STATS]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}