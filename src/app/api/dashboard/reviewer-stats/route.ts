import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responseCache, CacheTTL as ResponseCacheTTL, CacheTags, generateCacheKey } from '@/lib/response-cache';
import { parallelQueries } from '@/lib/db-optimizer';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has appropriate privileges for reviewer dashboard
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate cache key based on user role
    const cacheKey = generateCacheKey('reviewer-stats', { role: session.user.role });
    
    // Check cache first
    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Build role-based where clauses
    let submissionWhereClause = {};
    let userWhereClause = {};
    
    if (session.user.role === 'REVIEWER') {
      submissionWhereClause = {};
      userWhereClause = { role: 'VENDOR' };
    } else if (session.user.role === 'ADMIN') {
      userWhereClause = { role: { not: 'SUPER_ADMIN' } };
    }

    // Execute all queries in parallel
    const [
      totalSubmissions,
      submissionsByReviewStatus,
      submissionsByApprovalStatus,
      pendingUserVerifications,
      totalVerifiedUsers
    ] = await parallelQueries([
      () => prisma.submission.count({ where: submissionWhereClause }),
      
      () => prisma.submission.groupBy({
        by: ['review_status'],
        where: submissionWhereClause,
        _count: { id: true }
      }),
      
      () => prisma.submission.groupBy({
        by: ['approval_status'],
        where: submissionWhereClause,
        _count: { id: true }
      }),
      
      () => prisma.user.count({
        where: {
          AND: [
            { verified_at: null },
            { verification_status: { notIn: ['VERIFIED', 'REJECTED'] } },
            { rejection_reason: null },
            userWhereClause
          ]
        }
      }),
      
      () => prisma.user.count({
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
    const reviewStatusStats = submissionsByReviewStatus.reduce((acc: Record<string, number>, item: any) => {
      acc[item.review_status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const approvalStatusStats = submissionsByApprovalStatus.reduce((acc: Record<string, number>, item: any) => {
      acc[item.approval_status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Build response data
    const data = {
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

    const response = NextResponse.json(data);
    
    // Cache for 5 minutes with tags
    responseCache.set(
      cacheKey, 
      response, 
      ResponseCacheTTL.LONG,
      [CacheTags.REVIEWER_STATS, CacheTags.DASHBOARD]
    );

    return response;

  } catch (error) {
    console.error("[REVIEWER_DASHBOARD_STATS]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}