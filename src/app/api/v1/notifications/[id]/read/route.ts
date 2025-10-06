// src/app/api/v1/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveAudience } from "@/lib/notificationAudience";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const role   = session.user.role || "VENDOR";
    const id     = params.id;
    if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

    const audience = resolveAudience(req, role, userId);

    // Validasi notifikasi sesuai audience (optional tapi bagus)
    const notif = await prisma.notification.findFirst({
      where: {
        id,
        scope: audience.scope,
        ...(audience.readerKey === "vendor" ? { vendor_id: audience.readerId } : {}),
      },
      select: { id: true },
    });
    if (!notif) {
      return NextResponse.json({ success: false, error: "Notification not found" }, { status: 404 });
    }

    // Upsert read marker sesuai unique constraint yang benar
    if (audience.readerKey === "user") {
      await prisma.notificationRead.upsert({
        where: { notification_id_user_id: { notification_id: id, user_id: audience.readerId } },
        create: { notification_id: id, user_id: audience.readerId },
        update: {},
      });
    } else {
      await prisma.notificationRead.upsert({
        where: { notification_id_vendor_id: { notification_id: id, vendor_id: audience.readerId } },
        create: { notification_id: id, vendor_id: audience.readerId },
        update: {},
      });
    }

    // Don't invalidate cache since we disabled caching in the main route
    // await Cache.invalidateByPrefix(notifCacheKey(audience), CacheNamespaces.NOTIFICATIONS);

    // Hitung ulang unread
    const unreadCount = await prisma.notification.count({
      where: {
        scope: audience.scope,
        ...(audience.readerKey === "vendor" ? { vendor_id: audience.readerId } : {}),
        reads: audience.readerKey === "user"
          ? { none: { user_id: audience.readerId } }
          : { none: { vendor_id: audience.readerId } },
      },
    });

    const res = NextResponse.json({ success: true, data: { unreadCount } });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (e: any) {
    console.error("POST /api/v1/notifications/[id]/read error:", e);
    const res = NextResponse.json({ success: false, error: e.message || "Server error" }, { status: 500 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
