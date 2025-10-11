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
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get total submissions count
    const totalSubmissions = await prisma.submission.count({
      where: whereClause
    });

    // Get submissions by status
    const submissionsByStatus = await prisma.submission.groupBy({
      by: ['approval_status'],
      where: whereClause,
      _count: {
        id: true
      }
    });

    // Convert to more readable format
    const statusStats = submissionsByStatus.reduce((acc, item) => {
      acc[item.approval_status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Get recent activity (submissions from last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.submission.count({
      where: {
        ...whereClause,
        created_at: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Get today's submissions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySubmissions = await prisma.submission.count({
      where: {
        ...whereClause,
        created_at: {
          gte: today,
          lt: tomorrow
        }
      }
    });

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

    return NextResponse.json({ statistics });

  } catch (error) {
    console.error("[SUBMISSIONS_STATS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}