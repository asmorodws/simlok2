// src/app/api/v1/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveAudience } from "@/lib/notificationAudience";

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
    const search   = sp.get("search") || undefined;
    const filter   = (sp.get("filter") as "all" | "unread" | "read") || "all";

    // Disable caching completely to prevent stale data after mark as read
    // const cacheKey = `${notifCacheKey(audience)}:scope=${audience.scope}:p=${page}:s=${pageSize}:f=${filter}:q=${search || ""}`;
    // const cached = await Cache.getJSON<{ data: any[]; pagination: any }>(cacheKey, {
    //   namespace: CacheNamespaces.NOTIFICATIONS,
    // });
    // if (cached) {
    //   const res = NextResponse.json({ success: true, data: cached });
    //   res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    //   res.headers.set("Pragma", "no-cache");
    //   res.headers.set("Expires", "0");
    //   return res;
    // }

    // WHERE dasar: scope sesuai audience
    const where: any = { scope: audience.scope };
    // Untuk scope 'vendor' batasi vendor_id (notifikasi ke vendor tsb)
    if (audience.readerKey === "vendor") where.vendor_id = audience.readerId;

    if (search) {
      where.OR = [
        { title:   { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter read/unread berbasis relasi reads (bukan menyembunyikan notif)
    if (filter === "unread") {
      where.reads = audience.readerKey === "user"
        ? { none:  { user_id: audience.readerId } }
        : { none:  { vendor_id: audience.readerId } };
    } else if (filter === "read") {
      where.reads = audience.readerKey === "user"
        ? { some:  { user_id: audience.readerId } }
        : { some:  { vendor_id: audience.readerId } };
    }

    const [rows, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          scope: true,
          vendor_id: true,
          type: true,
          title: true,
          message: true,
          data: true,
          created_at: true,
          reads: {
            where: audience.readerKey === "user"
              ? { user_id: audience.readerId }
              : { vendor_id: audience.readerId },
            select: { id: true },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    const data = rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data ?? null,
      createdAt: n.created_at.toISOString(),
      isRead: n.reads.length > 0,
      scope: n.scope,
      vendorId: n.vendor_id ?? null,
    }));

    const result = {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };

    // Disable caching to prevent stale data
    // await Cache.setJSON(cacheKey, result, {
    //   namespace: CacheNamespaces.NOTIFICATIONS,
    //   ttl: NOTIF_LIST_TTL_SECONDS,
    // });

    const res = NextResponse.json({ success: true, data: result });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (e: any) {
    console.error("GET /api/v1/notifications error:", e);
    const res = NextResponse.json({ success: false, error: e.message || "Server error" }, { status: 500 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
