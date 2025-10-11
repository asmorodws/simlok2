import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Get submissions stats (role-based filtering)
    let submissionWhereClause = {};
    if (session.user.role === 'APPROVER') {
      // Approvers can see all submissions for approval
      submissionWhereClause = {};
    }

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

    // Count submissions that meet and don't meet requirements (based on review status)
    const pendingApprovalMeets = reviewStatusStats.MEETS_REQUIREMENTS || 0;
    const pendingApprovalNotMeets = reviewStatusStats.NOT_MEETS_REQUIREMENTS || 0;

    // Return dashboard stats
    const dashboardStats = {
      total: totalSubmissions,
      pending_approval_meets: pendingApprovalMeets,
      pending_approval_not_meets: pendingApprovalNotMeets,
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

    return NextResponse.json(dashboardStats);

  } catch (error) {
    console.error("[APPROVER_DASHBOARD_STATS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}