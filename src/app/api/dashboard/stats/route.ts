import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import DashboardService from "@/services/DashboardService";
import { UserRole } from "@/types/enums";

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

    // Get user statistics using DashboardService
    const stats = await DashboardService.getUserStats(
      session.user.role as UserRole,
      true // include recent users
    );

    return NextResponse.json({
      ...stats,
      // Legacy compatibility
      pendingVerifications: stats.totalPending
    });

  } catch (error) {
    console.error("[DASHBOARD_STATS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}