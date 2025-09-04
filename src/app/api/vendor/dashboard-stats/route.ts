import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
          user_id: userId,
          approval_status: "APPROVED"
        }
      }),
      prisma.submission.count({
        where: {
          user_id: userId,
          approval_status: "PENDING"
        }
      }),
      prisma.submission.count({
        where: {
          user_id: userId,
          approval_status: "REJECTED"
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
