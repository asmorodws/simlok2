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

    // OPTIMIZED: Use single groupBy query instead of 4 separate counts
    const [verificationStats, totalUsers, todayRegistrations] = await Promise.all([
      // Get verification status breakdown in one query
      prisma.user.groupBy({
        by: ['verification_status'],
        where: userWhereClause,
        _count: { id: true },
      }),
      
      // Total users count
      prisma.user.count({
        where: userWhereClause
      }),
      
      // Today's registrations
      (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return prisma.user.count({
          where: {
            ...userWhereClause,
            created_at: {
              gte: today,
              lt: tomorrow
            }
          }
        });
      })()
    ]);

    // Convert groupBy results to object for easy access
    const statsByStatus = verificationStats.reduce((acc, curr) => {
      acc[curr.verification_status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    const totalPending = statsByStatus.PENDING || 0;
    const totalVerified = statsByStatus.VERIFIED || 0;
    const totalRejected = statsByStatus.REJECTED || 0;

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
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60',
        'X-Cache-TTL': '60'
      }
    });

  } catch (error) {
    console.error("[DASHBOARD_STATS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}