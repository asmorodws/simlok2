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

    // Validate user role
    const allowedRoles = ['VENDOR', 'REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN', 'VERIFIER'];
    if (!allowedRoles.includes(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get submission statistics using DashboardService
    const userId = session.user.role === 'VENDOR' ? session.user.id : undefined;
    const statistics = await DashboardService.getSubmissionStats(
      session.user.role as UserRole,
      userId
    );

    return NextResponse.json({ statistics });

  } catch (error) {
    console.error("[SUBMISSIONS_STATS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}