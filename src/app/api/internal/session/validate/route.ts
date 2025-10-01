// src/app/api/internal/session/validate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/singletons";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("uid");

    if (!userId) {
      return NextResponse.json(
        { isValid: false, shouldLogout: true, reason: "MISSING_UID" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { isValid: false, shouldLogout: true, reason: "USER_NOT_FOUND_OR_INACTIVE" },
        { status: 200 }
      );
    }

    return NextResponse.json({ isValid: true });
  } catch (e) {
    console.error("validate-session error:", e);
    // Pada error, lebih aman paksa logout agar tidak kebobolan.
    return NextResponse.json(
      { isValid: false, shouldLogout: true, reason: "SERVER_ERROR" },
      { status: 200 }
    );
  }
}
