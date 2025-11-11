// src/app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { resolveAudience } from "@/lib/notificationAudience";
import { NotificationService } from "@/services/NotificationService";

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

    // Use NotificationService to mark as read
    await NotificationService.markAsRead(
      id,
      audience.readerKey === "user" ? audience.readerId : undefined,
      audience.readerKey === "vendor" ? audience.readerId : undefined
    );

    // Get updated unread count
    const unreadCount = await NotificationService.getUnreadCount(
      audience.readerKey === "user" ? audience.readerId : undefined,
      audience.readerKey === "vendor" ? audience.readerId : undefined
    );

    const res = NextResponse.json({ success: true, data: { unreadCount } });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (e: any) {
    console.error("POST /api/notifications/[id]/read error:", e);
    
    // Handle specific error messages
    if (e.message && e.message.includes('not found')) {
      return NextResponse.json({ success: false, error: "Notification not found" }, { status: 404 });
    }
    
    const res = NextResponse.json({ success: false, error: e.message || "Server error" }, { status: 500 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
