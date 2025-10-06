// src/app/api/v1/notifications/read-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveAudience } from "@/lib/notificationAudience";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const role   = session.user.role || "VENDOR";

    const audience = resolveAudience(req, role, userId);

    // Ambil semua notification id yg belum dibaca oleh audience ini
    const unread = await prisma.notification.findMany({
      where: {
        scope: audience.scope,
        ...(audience.readerKey === "vendor" ? { vendor_id: audience.readerId } : {}),
        reads: audience.readerKey === "user"
          ? { none: { user_id: audience.readerId } }
          : { none: { vendor_id: audience.readerId } },
      },
      select: { id: true },
    });

    if (unread.length > 0) {
      if (audience.readerKey === "user") {
        await prisma.notificationRead.createMany({
          data: unread.map((n) => ({ notification_id: n.id, user_id: audience.readerId })),
          skipDuplicates: true,
        });
      } else {
        await prisma.notificationRead.createMany({
          data: unread.map((n) => ({ notification_id: n.id, vendor_id: audience.readerId })),
          skipDuplicates: true,
        });
      }
    }

    // Don't invalidate cache since we disabled caching in the main route
    // await Cache.invalidateByPrefix(notifCacheKey(audience), CacheNamespaces.NOTIFICATIONS);

    const res = NextResponse.json({ success: true, data: { unreadCount: 0 } });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (e: any) {
    console.error("POST /api/v1/notifications/read-all error:", e);
    const res = NextResponse.json({ success: false, error: e.message || "Server error" }, { status: 500 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
