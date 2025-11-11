// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { resolveAudience } from "@/lib/notificationAudience";
import { NotificationService } from "@/services/NotificationService";
import { NotificationScope } from "@/types/enums";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const role   = session.user.role || "VENDOR";

    // audience (scope + siapa yang membaca)
    const audience = resolveAudience(req, role, userId);

    const sp = new URL(req.url).searchParams;
    const page     = Math.max(1, parseInt(sp.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "20", 10)));
    const filter   = (sp.get("filter") as "all" | "unread" | "read") || "all";

    // Use NotificationService to get notifications
    const result = await NotificationService.getNotifications({
      ...(audience.readerKey === "user" && { userId: audience.readerId }),
      ...(audience.readerKey === "vendor" && { vendorId: audience.readerId }),
      unreadOnly: filter === "unread",
      scope: audience.scope as NotificationScope,
      page,
      limit: pageSize,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });

    const res = NextResponse.json({ success: true, data: result });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (e: any) {
    console.error("GET /api/notifications error:", e);
    const res = NextResponse.json({ success: false, error: e.message || "Server error" }, { status: 500 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
