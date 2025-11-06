// src/app/api/v1/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toJakartaISOString } from '@/lib/timezone';
import { resolveAudience } from "@/lib/notificationAudience";
import { responseCache, CacheTTL, CacheTags, generateCacheKey } from '@/lib/response-cache';
import { parallelQueries } from '@/lib/db-optimizer';

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

    // Try cache first (30 seconds TTL for notifications - short because they update frequently)
    const cacheKey = generateCacheKey('notifications', {
      userId,
      role,
      scope: audience.scope,
      page,
      pageSize,
      filter,
      search,
    });

    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

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

    const [rows, total] = await parallelQueries([
      () => prisma.notification.findMany({
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
      () => prisma.notification.count({ where }),
    ]);

    const data = rows.map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data ?? null,
      createdAt: toJakartaISOString(n.created_at) || n.created_at?.toISOString?.() || null,
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

    const res = NextResponse.json({ success: true, data: result });
    res.headers.set("Cache-Control", "private, max-age=30");
    
    // Cache for 30 seconds (notifications update frequently)
    responseCache.set(
      cacheKey,
      res,
      CacheTTL.SHORT, // 30 seconds
      [CacheTags.NOTIFICATIONS, `user:${userId}`]
    );
    
    return res;
  } catch (e: any) {
    console.error("GET /api/v1/notifications error:", e);
    const res = NextResponse.json({ success: false, error: e.message || "Server error" }, { status: 500 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
