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

    // Check if user has appropriate privileges for reviewer dashboard
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Use cache for dashboard stats
    const { data: dashboardStats, cached } = await withCache(
      CacheKeys.REVIEWER_STATS,
      CacheTTL.ONE_MINUTE,
      async () => {
        return await fetchReviewerStats(session.user.role);
      }
    );

    return NextResponse.json(dashboardStats, {
      headers: {
        'X-Cache': cached ? 'HIT' : 'MISS',
        'Cache-Control': 'private, max-age=60',
      }
    });

  } catch (error) {
    console.error("[REVIEWER_DASHBOARD_STATS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

async function fetchReviewerStats(userRole: string) {
  // Get submissions stats (role-based filtering)
  let submissionWhereClause = {};
  if (userRole === 'REVIEWER') {
    // Reviewers can see all submissions for review
    submissionWhereClause = {};
  }

  // Get user verification stats (for reviewers who can verify users)
  let userWhereClause = {};
  if (userRole === 'REVIEWER') {
    // Reviewers typically verify VENDOR users
    userWhereClause = { role: 'VENDOR' };
  } else if (userRole === 'ADMIN') {
    // Admin can see all except SUPER_ADMIN
    userWhereClause = { role: { not: 'SUPER_ADMIN' } };
  } else if (userRole === 'SUPER_ADMIN') {
    // Super admin can see all users
    userWhereClause = {};
  }

    // Get submission statistics
    const totalSubmissions = await prisma.submission.count({
      where: submissionWhereClause
    });

    const submissionsByReviewStatus = await prisma.submission.groupBy({
      by: ['review_status'],
      where: submissionWhereClause,
      _count: {
        id: true
      }
    });

    const submissionsByApprovalStatus = await prisma.submission.groupBy({
      by: ['approval_status'],
      where: submissionWhereClause,
      _count: {
        id: true
      }
    });

    // Get user verification statistics - OPTIMIZED with groupBy
    const userVerificationStats = await prisma.user.groupBy({
      by: ['verification_status'],
      where: userWhereClause,
      _count: { id: true },
    });

    const userStatsByStatus = userVerificationStats.reduce((acc, curr) => {
      acc[curr.verification_status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    const pendingUserVerifications = userStatsByStatus.PENDING || 0;
    const totalVerifiedUsers = userStatsByStatus.VERIFIED || 0;

    // Process submission stats
    const reviewStatusStats = submissionsByReviewStatus.reduce((acc, item) => {
      acc[item.review_status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const approvalStatusStats = submissionsByApprovalStatus.reduce((acc, item) => {
      acc[item.approval_status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

  // Return dashboard stats
  return {
    submissions: {
      total: totalSubmissions,
      byReviewStatus: {
        PENDING_REVIEW: reviewStatusStats.PENDING_REVIEW || 0,
        MEETS_REQUIREMENTS: reviewStatusStats.MEETS_REQUIREMENTS || 0,
        NOT_MEETS_REQUIREMENTS: reviewStatusStats.NOT_MEETS_REQUIREMENTS || 0,
      },
      byApprovalStatus: {
        PENDING: approvalStatusStats.PENDING_APPROVAL || 0,
        IN_REVIEW: approvalStatusStats.IN_REVIEW || 0,
        APPROVED: approvalStatusStats.APPROVED || 0,
        REJECTED: approvalStatusStats.REJECTED || 0,
        REVISION_REQUIRED: approvalStatusStats.REVISION_REQUIRED || 0,
      }
    },
    users: {
      pendingVerifications: pendingUserVerifications,
      totalVerified: totalVerifiedUsers
    }
  };
}