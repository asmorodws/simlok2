import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/singletons";
import { withCache } from "@/lib/cache/apiCache";
import { CacheKeys, CacheTTL } from "@/lib/cache/cache";
import { ReviewStatus, ApprovalStatus } from "@prisma/client";
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
      RoleGroups.APPROVERS,
      'Only approvers, admins, and super admins can access this dashboard'
    );
    if (userOrError instanceof NextResponse) return userOrError;

    // Use cache for dashboard stats
    const { data: dashboardStats, cached } = await withCache(
      CacheKeys.APPROVER_STATS,
      CacheTTL.ONE_MINUTE,
      async () => {
        return await fetchApproverStats();
      }
    );

    return successResponse(dashboardStats, { cached });

  } catch (error) {
    return internalErrorResponse('APPROVER_DASHBOARD_STATS', error);
  }
}

async function fetchApproverStats() {
  // Approvers only see submissions that meet requirements
  const submissionWhereClause = {
    review_status: ReviewStatus.MEETS_REQUIREMENTS
  };

  // Parallelize all statistics queries for better performance
  const [
    totalSubmissions,
    submissionsByApprovalStatus,
    submissionsByReviewStatus,
    pendingApprovalMeetsCount
  ] = await Promise.all([
    // Get submission statistics
    prisma.submission.count({
      where: submissionWhereClause
    }),
    prisma.submission.groupBy({
      by: ['approval_status'],
      where: submissionWhereClause,
      _count: {
        id: true
      }
    }),
    prisma.submission.groupBy({
      by: ['review_status'],
      where: submissionWhereClause,
      _count: {
        id: true
      }
    }),
    // Count pending approvals - ONLY submissions that meet requirements
    prisma.submission.count({
      where: {
        ...submissionWhereClause,
        approval_status: ApprovalStatus.PENDING_APPROVAL,
        review_status: ReviewStatus.MEETS_REQUIREMENTS
      }
    })
  ]);

  // Process submission stats
    const approvalStatusStats = submissionsByApprovalStatus.reduce((acc, item) => {
      acc[item.approval_status] = item._count?.id ?? 0;
      return acc;
    }, {} as Record<string, number>);

    const reviewStatusStats = submissionsByReviewStatus.reduce((acc, item) => {
      acc[item.review_status] = item._count?.id ?? 0;
      return acc;
    }, {} as Record<string, number>);


  // Return dashboard stats
  return {
    total: totalSubmissions,
    pending_approval_meets: pendingApprovalMeetsCount,
    pending_approval_not_meets: 0, // Approvers don't see NOT_MEETS submissions
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
      PENDING_REVIEW: 0, // Approvers don't see pending review
      MEETS_REQUIREMENTS: reviewStatusStats.MEETS_REQUIREMENTS || 0,
      NOT_MEETS_REQUIREMENTS: 0, // Approvers don't see NOT_MEETS
    }
  };
}