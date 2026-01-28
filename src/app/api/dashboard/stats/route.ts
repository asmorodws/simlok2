import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/singletons";
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';
import { PAGINATION } from '@/lib/constants';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Use helper for session and role validation
    const userOrError = requireSessionWithRole(
      session,
      RoleGroups.ADMINS,
      'Only admins and super admins can access dashboard stats'
    );
    if (userOrError instanceof NextResponse) return userOrError;

    // Get total users count (excluding SUPER_ADMIN for ADMIN role)
    const userWhereClause = userOrError.role === 'ADMIN' 
      ? { role: { not: 'SUPER_ADMIN' as const } }
      : {};

    // Parallelize all database queries for better performance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalUsers,
      totalPending,
      totalVerified,
      totalRejected,
      todayRegistrations,
      recentUsers
    ] = await Promise.all([
      // Get total users count
      prisma.user.count({
        where: userWhereClause
      }),
      // Get pending verifications count
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
      // Get verified users count
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
      }),
      // Get rejected users count
      prisma.user.count({
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
      // Get today's registrations
      prisma.user.count({
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
      // Get recent users (latest 5)
      prisma.user.findMany({
        where: userWhereClause,
        orderBy: {
          created_at: 'desc'
        },
        take: PAGINATION.DASHBOARD_STATS_TOP_LIMIT,
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

    return NextResponse.json({
      totalUsers,
      totalPending,
      totalVerified, 
      totalRejected,
      todayRegistrations,
      recentUsers,
      // Legacy compatibility
      pendingVerifications: totalPending
    });

  } catch (error) {
    console.error("[DASHBOARD_STATS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}