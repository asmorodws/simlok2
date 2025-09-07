import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/singletons";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "VENDOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get statistics for all submissions (no filters)
    const totalCount = await prisma.submission.count({ 
      where: { user_id: userId } 
    });

    const stats = await prisma.submission.groupBy({
      by: ['approval_status'],
      where: { user_id: userId },
      _count: {
        approval_status: true
      }
    });

    const statistics = {
      total: totalCount,
      pending: stats.find(s => s.approval_status === 'PENDING')?._count.approval_status || 0,
      approved: stats.find(s => s.approval_status === 'APPROVED')?._count.approval_status || 0,
      rejected: stats.find(s => s.approval_status === 'REJECTED')?._count.approval_status || 0
    };

    return NextResponse.json({
      statistics
    });

  } catch (error) {
    console.error("Vendor statistics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
