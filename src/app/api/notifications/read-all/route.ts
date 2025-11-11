// src/app/api/notifications/read-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { resolveAudience } from "@/lib/notificationAudience";
import { NotificationService } from "@/services/NotificationService";
import { NotificationScope } from "@/types/enums";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const role   = session.user.role || "VENDOR";

    const audience = resolveAudience(req, role, userId);

    // Use NotificationService to mark all as read
    await NotificationService.markAllAsRead(
      audience.readerKey === "user" ? audience.readerId : undefined,
      audience.readerKey === "vendor" ? audience.readerId : undefined,
      audience.scope as NotificationScope
    );

    const res = NextResponse.json({ success: true, data: { unreadCount: 0 } });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (e: any) {
    console.error("POST /api/notifications/read-all error:", e);
    const res = NextResponse.json({ success: false, error: e.message || "Server error" }, { status: 500 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
