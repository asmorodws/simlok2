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

    // Check if user has appropriate privileges
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Try cache first (15 min TTL for stats)
    const cacheKey = generateCacheKey('dashboard-stats', {
      role: session.user.role,
    });

    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get total users count (excluding SUPER_ADMIN for ADMIN role)
    const userWhereClause = session.user.role === 'ADMIN' 
      ? { role: { not: 'SUPER_ADMIN' as const } }
      : {};

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run all count queries in parallel for better performance
    const [
      totalUsers,
      totalPending,
      totalVerified,
      totalRejected,
      todayRegistrations,
      recentUsers
    ] = await parallelQueries([
      // Total users
      () => prisma.user.count({ where: userWhereClause }),
      
      // Pending verifications
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
      
      // Verified users
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
      }),
      
      // Rejected users
      () => prisma.user.count({
        where: {
          AND: [
            {
              OR: [
                { rejection_reason: { not: null } },
                { verification_status: 'REJECTED' }
              ]
            },
            userWhereClause
          ]
        }
      }),
      
      // Today's registrations
      () => prisma.user.count({
        where: {
          AND: [
            {
              created_at: {
                gte: today,
                lt: tomorrow
              }
            },
            userWhereClause
          ]
        }
      }),
      
      // Recent users
      () => prisma.user.findMany({
        where: userWhereClause,
        orderBy: {
          created_at: 'desc'
        },
        take: 5,
        select: {
          id: true,
          email: true,
          officer_name: true,
          vendor_name: true,
          phone_number: true,
          address: true,
          role: true,
          verified_at: true,
          verification_status: true,
          rejection_reason: true,
          rejected_at: true,
          created_at: true,
          isActive: true
        }
      })
    ]);

    const response = NextResponse.json({
      totalUsers,
      totalPending,
      totalVerified, 
      totalRejected,
      todayRegistrations,
      recentUsers,
      // Legacy compatibility
      pendingVerifications: totalPending
    });

    // Cache the response for 15 minutes (stats don't change frequently)
    responseCache.set(
      cacheKey,
      response,
      CacheTTL.VERY_LONG, // 15 minutes
      [CacheTags.DASHBOARD]
    );

    return response;

  } catch (error) {
    console.error("[DASHBOARD_STATS]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}