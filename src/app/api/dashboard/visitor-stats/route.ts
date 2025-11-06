import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responseCache, CacheTTL, CacheTags, generateCacheKey } from '@/lib/response-cache';
import { parallelQueries } from '@/lib/db-optimizer';
import { toJakartaISOString } from '@/lib/timezone';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has appropriate privileges for visitor dashboard
    if (!['VISITOR', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate cache key
    const cacheKey = generateCacheKey('visitor-stats', {});
    
    // Check cache first
    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate today's range (Jakarta timezone)
    const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const today = new Date(jakartaNow);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Execute all queries in parallel
    const [
      totalSubmissions,
      submissionsByApprovalStatus,
      submissionsByReviewStatus,
      totalQrScans,
      todayQrScans,
      totalUsers,
      totalVerifiedUsers,
      pendingUserVerifications
    ] = await parallelQueries([
      () => prisma.submission.count(),
      
      () => prisma.submission.groupBy({
        by: ['approval_status'],
        _count: { id: true }
      }),
      
      () => prisma.submission.groupBy({
        by: ['review_status'],
        _count: { id: true }
      }),
      
      () => prisma.qrScan.count(),
      
      () => prisma.qrScan.count({
        where: {
          scanned_at: {
            gte: todayStart,
            lt: todayEnd
          }
        }
      }),
      
      () => prisma.user.count(),
      
      () => prisma.user.count({
        where: {
          OR: [
            { verified_at: { not: null } },
            { verification_status: 'VERIFIED' }
          ]
        }
      }),
      
      () => prisma.user.count({
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
    const reviewStatusStats = submissionsByReviewStatus?.reduce((acc: Record<string, number>, item: any) => {
      if (item?.review_status && item?._count?.id) {
        acc[item.review_status] = item._count.id;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    const approvalStatusStats = submissionsByApprovalStatus?.reduce((acc: Record<string, number>, item: any) => {
      if (item?.approval_status && item?._count?.id) {
        acc[item.approval_status] = item._count.id;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    // Build response data
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

    const response = NextResponse.json(dashboardStats);
    
    // Cache for 1 minute with tags
    responseCache.set(
      cacheKey, 
      response, 
      CacheTTL.MEDIUM,
      [CacheTags.VISITOR_STATS, CacheTags.DASHBOARD]
    );

    return response;

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