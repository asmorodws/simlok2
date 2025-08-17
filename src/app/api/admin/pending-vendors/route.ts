import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pending vendors (VENDOR role users without verified_at)
    const vendors = await prisma.user.findMany({
      where: {
        role: "VENDOR",
        verified_at: null
      },
      select: {
        id: true,
        nama_petugas: true,
        email: true,
        nama_vendor: true,
        date_created_at: true,
        role: true,
        alamat: true,
        no_telp: true,
        verified_at: true,
        verified_by: true
      },
      orderBy: {
        date_created_at: "desc"
      },
      take: 5
    });

    return NextResponse.json({
      vendors
    });

  } catch (error) {
    console.error("Pending vendors error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
