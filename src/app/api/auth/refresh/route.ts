import { NextResponse } from "next/server";
import { TokenManager } from "@/utils/token-manager";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/security/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token required" }, { status: 400 });
    }

    // Verify and rotate refresh token
    const validToken = await TokenManager.getValidRefreshToken(refreshToken);
    
    if (!validToken || validToken.userId !== session.user.id) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    // Rotate token
    const newToken = await TokenManager.rotateRefreshToken(session.user.id, refreshToken);

    return NextResponse.json({
      refreshToken: newToken.token,
      expiresAt: newToken.expiresAt
    });

  } catch (error) {
    console.error("Error refreshing token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}