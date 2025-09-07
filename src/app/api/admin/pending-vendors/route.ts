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

    // Get pending vendors (VENDOR role users without verified_at)
    const vendors = await prisma.user.findMany({
      where: {
        role: "VENDOR",
        verified_at: null
      },
      select: {
        id: true,
        officer_name: true,
        email: true,
        vendor_name: true,
        created_at: true,
        role: true,
        address: true,
        phone_number: true,
        verified_at: true,
        verified_by: true
      },
      orderBy: {
        created_at: "desc"
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
