import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/singletons";
import cache, { CacheKeys, CacheTTL } from "@/lib/cache/cache";
import { toJakartaISOString } from '@/lib/helpers/timezone';
import { 
  successResponse
} from "@/lib/api/apiResponse";
import { requireSessionWithRole } from '@/lib/auth/roleHelpers';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Use helper for session and role validation
    // Note: VISITOR role not in standard groups, so check individually
    const userOrError = requireSessionWithRole(
      session,
      ['VISITOR', 'SUPER_ADMIN'],
      'Only visitors and super admins can access this dashboard'
    );
    if (userOrError instanceof NextResponse) return userOrError;

    // Check cache first
    const cachedData = cache.get(CacheKeys.VISITOR_STATS);
    if (cachedData) {
      return successResponse(cachedData, { 
        cached: true,
        headers: {
          'Cache-Control': 'private, max-age=60',
        }
      });
    }

    // Get submissions stats (visitors can view all submissions but read-only)
    const submissionWhereClause = {};
    
    // Execute all database queries in parallel for better performance
    const [
      totalSubmissions,
      submissionsByApprovalStatus,
      submissionsByReviewStatus,
      totalQrScans,
      todayQrScans,
      totalUsers,
      totalVerifiedUsers,
      pendingUserVerifications
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

      // Get QR scan statistics
      prisma.qrScan.count(),

      // Get today's QR scans (Jakarta timezone)
      (() => {
        const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
        const today = new Date(jakartaNow);
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        return prisma.qrScan.count({
          where: {
            scanned_at: {
              gte: todayStart,
              lt: todayEnd
            }
          }
        });
      })(),

      // Get user statistics
      prisma.user.count(),

      prisma.user.count({
        where: {
          OR: [
            { verified_at: { not: null } },
            { verification_status: 'VERIFIED' }
          ]
        }
      }),

      prisma.user.count({
        where: {
          AND: [
            { verified_at: null },
            { verification_status: { notIn: ['VERIFIED', 'REJECTED'] } },
            { rejection_reason: null }
          ]
        }
      })
    ]);

    // Process submission stats safely
    const reviewStatusStats = submissionsByReviewStatus?.reduce((acc, item) => {
      if (item?.review_status && item?._count?.id) {
        acc[item.review_status] = item._count.id;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    const approvalStatusStats = submissionsByApprovalStatus?.reduce((acc, item) => {
      if (item?.approval_status && item?._count?.id) {
        acc[item.approval_status] = item._count.id;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    // Return dashboard stats similar to reviewer but for visitor viewing
    const dashboardStats = {
      success: true,
      timestamp: toJakartaISOString(new Date()) || new Date().toISOString(),
      submissions: {
        total: totalSubmissions || 0,
        byReviewStatus: {
          PENDING_REVIEW: reviewStatusStats.PENDING_REVIEW || 0,
          MEETS_REQUIREMENTS: reviewStatusStats.MEETS_REQUIREMENTS || 0,
          NOT_MEETS_REQUIREMENTS: reviewStatusStats.NOT_MEETS_REQUIREMENTS || 0,
        },
        byApprovalStatus: {
          PENDING: approvalStatusStats.PENDING || 0,
          APPROVED: approvalStatusStats.APPROVED || 0,
          REJECTED: approvalStatusStats.REJECTED || 0,
        }
      },
      users: {
        total: totalUsers || 0,
        pendingVerifications: pendingUserVerifications || 0,
        totalVerified: totalVerifiedUsers || 0
      },
      qrScans: {
        total: totalQrScans || 0,
        today: todayQrScans || 0
      }
    };

    // Cache the response for 1 minute
    cache.set(CacheKeys.VISITOR_STATS, dashboardStats, CacheTTL.ONE_MINUTE);

    return NextResponse.json(dashboardStats, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=60',
      }
    });

  } catch (error) {
    console.error("[VISITOR_DASHBOARD_STATS] Error:", error);
    
    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: "Internal Server Error", 
        message: errorMessage,
        timestamp: toJakartaISOString(new Date()) || new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}