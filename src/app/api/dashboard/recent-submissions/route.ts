import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/security/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";

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

    // Get recent submissions based on user role
    let whereClause = {};
    
    if (session.user.role === 'ADMIN') {
      // ADMIN can see all submissions
      whereClause = {};
    } else if (session.user.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN can see all submissions
      whereClause = {};
    }

    const recentSubmissions = await prisma.submission.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc'
      },
      take: 10,
      select: {
        id: true,
        simlok_number: true,
        vendor_name: true,
        officer_name: true,
        approval_status: true,
        created_at: true,
        user: {
          select: {
            officer_name: true,
            vendor_name: true
          }
        }
      }
    });

    return NextResponse.json(recentSubmissions);

  } catch (error) {
    console.error("[DASHBOARD_RECENT_SUBMISSIONS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}