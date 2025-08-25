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

    // Get latest 5 submissions for current vendor
    const submissions = await prisma.submission.findMany({
      where: {
        userId: userId
      },
      select: {
        id: true,
        pekerjaan: true,
        lokasi_kerja: true,
        status_approval_admin: true,
        nomor_simlok: true,
        created_at: true
      },
      orderBy: {
        created_at: "desc"
      },
      take: 5
    });

    return NextResponse.json({
      submissions
    });

  } catch (error) {
    console.error("Vendor latest submissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
