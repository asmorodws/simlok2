import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/singletons";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Data untuk admin
    if (session.user.role === "ADMIN") {
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
    }
    
    // Data untuk super admin
    if (session.user.role === "SUPER_ADMIN") {
      // Dapatkan total user
      const totalUsers = await prisma.user.count();

      // Dapatkan jumlah user yang belum diverifikasi
      const pendingVerifications = await prisma.user.count({
        where: {
          verified_at: null,
        },
      });

      // Dapatkan 5 user terbaru
      const recentUsers = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          officer_name: true,
          role: true,
          vendor_name: true,
          created_at: true,
          verified_at: true,
        },
        orderBy: {
          created_at: "desc",
        },
        take: 5,
      });

      return NextResponse.json({
        totalUsers,
        pendingVerifications,
        recentUsers,
      });
    }
    
    // Fallback jika tidak masuk ke salah satu condition di atas
    return NextResponse.json({ error: "Invalid role configuration" }, { status: 400 });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
