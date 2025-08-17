import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "VENDOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get statistics for current vendor
    const [totalApproved, totalPending, totalRejected] = await Promise.all([
      prisma.submission.count({
        where: {
          userId: userId,
          status_approval_admin: "APPROVED"
        }
      }),
      prisma.submission.count({
        where: {
          userId: userId,
          status_approval_admin: "PENDING"
        }
      }),
      prisma.submission.count({
        where: {
          userId: userId,
          status_approval_admin: "REJECTED"
        }
      })
    ]);

    return NextResponse.json({
      totalApproved,
      totalPending,
      totalRejected
    });

  } catch (error) {
    console.error("Vendor dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
