import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCache } from "@/lib/api-cache";
import { CacheKeys, CacheTTL } from "@/lib/cache";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user has appropriate privileges for approver dashboard
    if (!['APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Use cache for dashboard stats
    const { data: dashboardStats, cached } = await withCache(
      CacheKeys.APPROVER_STATS,
      CacheTTL.ONE_MINUTE,
      async () => {
        return await fetchApproverStats();
      }
    );

    return NextResponse.json(dashboardStats, {
      headers: {
        'X-Cache': cached ? 'HIT' : 'MISS'
      }
    });

  } catch (error) {
    console.error("[APPROVER_DASHBOARD_STATS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

async function fetchApproverStats() {
  // Get submissions stats (role-based filtering)
  const submissionWhereClause = {};

    // Get submission statistics
    const totalSubmissions = await prisma.submission.count({
      where: submissionWhereClause
    });

    const submissionsByApprovalStatus = await prisma.submission.groupBy({
      by: ['approval_status'],
      where: submissionWhereClause,
      _count: {
        id: true
      }
    });

    const submissionsByReviewStatus = await prisma.submission.groupBy({
      by: ['review_status'],
      where: submissionWhereClause,
      _count: {
        id: true
      }
    });

    // Process submission stats
    const approvalStatusStats = submissionsByApprovalStatus.reduce((acc, item) => {
      acc[item.approval_status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const reviewStatusStats = submissionsByReviewStatus.reduce((acc, item) => {
      acc[item.review_status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Count pending approvals - ONLY submissions with PENDING_APPROVAL status
    // Split by review status for detailed tracking
    const pendingApprovalMeetsCount = await prisma.submission.count({
      where: {
        ...submissionWhereClause,
        approval_status: 'PENDING_APPROVAL',
        review_status: 'MEETS_REQUIREMENTS'
      }
    });

    const pendingApprovalNotMeetsCount = await prisma.submission.count({
      where: {
        ...submissionWhereClause,
        approval_status: 'PENDING_APPROVAL',
        review_status: 'NOT_MEETS_REQUIREMENTS'
      }
    });

  // Return dashboard stats
  return {
    total: totalSubmissions,
    pending_approval_meets: pendingApprovalMeetsCount,
    pending_approval_not_meets: pendingApprovalNotMeetsCount,
    approved: approvalStatusStats.APPROVED || 0,
    rejected: approvalStatusStats.REJECTED || 0,
    // Additional detailed stats
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
}