/**
 * @deprecated Use /api/dashboard/stats instead
 * This endpoint redirects to the unified stats endpoint
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import { dashboardService } from '@/services/DashboardService';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const allowedRoles = ['VENDOR', 'REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN', 'VERIFIER'];
    if (!allowedRoles.includes(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Use service to get statistics
    const statistics = await dashboardService.getSubmissionStats(
      session.user.id,
      session.user.role
    );

    return NextResponse.json({ statistics });
  } catch (error) {
    console.error("[SUBMISSIONS_STATS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
