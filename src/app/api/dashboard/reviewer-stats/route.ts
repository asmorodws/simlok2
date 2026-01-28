import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/singletons";
import { withCache } from "@/lib/cache/apiCache";
import { CacheKeys, CacheTTL } from "@/lib/cache/cache";
import { 
  successResponse, 
  internalErrorResponse 
} from "@/lib/api/apiResponse";
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Use helper for session and role validation
    const userOrError = requireSessionWithRole(
      session,
      RoleGroups.REVIEWERS,
      'Only reviewers, admins, and super admins can access this dashboard'
    );
    if (userOrError instanceof NextResponse) return userOrError;

    // Use cache for dashboard stats
    const { data: dashboardStats, cached } = await withCache(
      CacheKeys.REVIEWER_STATS,
      CacheTTL.ONE_MINUTE,
      async () => {
        return await fetchReviewerStats(userOrError.role);
      }
    );

    return successResponse(dashboardStats, { cached });

  } catch (error) {
    return internalErrorResponse('REVIEWER_DASHBOARD_STATS', error);
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

    // Parallelize all statistics queries for better performance
    const [
      totalSubmissions,
      submissionsByReviewStatus,
      submissionsByApprovalStatus,
      pendingUserVerifications,
      totalVerifiedUsers
    ] = await Promise.all([
      // Get submission statistics
      prisma.submission.count({
        where: submissionWhereClause
      }),
      prisma.submission.groupBy({
        by: ['review_status'],
        where: submissionWhereClause,
        _count: {
          id: true
        }
      }),
      prisma.submission.groupBy({
        by: ['approval_status'],
        where: submissionWhereClause,
        _count: {
          id: true
        }
      }),
      // Get user verification statistics
      prisma.user.count({
        where: {
          AND: [
            { verified_at: null },
            { verification_status: { notIn: ['VERIFIED', 'REJECTED'] } },
            { rejection_reason: null },
            userWhereClause
          ]
        }
      }),
      prisma.user.count({
        where: {
          AND: [
            {
              OR: [
                { verified_at: { not: null } },
                { verification_status: 'VERIFIED' }
              ]
            },
            userWhereClause
          ]
        }
      })
    ]);

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