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

    // Get latest 5 submissions
    const submissions = await prisma.submission.findMany({
      select: {
        id: true,
        vendor_name: true,
        job_description: true,
        approval_status: true,
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
    console.error("Latest submissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
