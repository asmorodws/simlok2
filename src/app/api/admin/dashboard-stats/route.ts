import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/singletons";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total vendors (users with VENDOR role)
    const totalVendors = await prisma.user.count({
      where: {
        role: "VENDOR"
      }
    });

    // Get pending verification vendors (VENDOR role users without verified_at)
    const pendingVerificationVendors = await prisma.user.count({
      where: {
        role: "VENDOR",
        verified_at: null
      }
    });

    // Get pending verification submissions (submissions with PENDING status)
    const pendingVerificationSubmissions = await prisma.submission.count({
      where: {
        approval_status: "PENDING"
      }
    });

    return NextResponse.json({
      totalVendors,
      pendingVerificationVendors,
      pendingVerificationSubmissions
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
