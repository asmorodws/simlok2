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

    // Check if user has appropriate privileges
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get total users count (excluding SUPER_ADMIN for ADMIN role)
    const userWhereClause = session.user.role === 'ADMIN' 
      ? { role: { not: 'SUPER_ADMIN' as const } }
      : {};

    const totalUsers = await prisma.user.count({
      where: userWhereClause
    });

    // Get pending verifications count (users not verified and not rejected)
    const totalPending = await prisma.user.count({
      where: {
        AND: [
          { verified_at: null },
          { verification_status: { notIn: ['VERIFIED', 'REJECTED'] } },
          { rejection_reason: null },
          userWhereClause
        ]
      }
    });

    // Get verified users count
    const totalVerified = await prisma.user.count({
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
    });

    // Get rejected users count
    const totalRejected = await prisma.user.count({
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
    });

    // Get today's registrations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayRegistrations = await prisma.user.count({
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
    });

    // Get recent users (latest 5)
    const recentUsers = await prisma.user.findMany({
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
    });

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