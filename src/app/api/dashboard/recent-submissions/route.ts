import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responseCache, CacheTTL, CacheTags, generateCacheKey } from '@/lib/response-cache';
import { submissionSelectList } from '@/lib/db-optimizer';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has appropriate privileges
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate cache key
    const cacheKey = generateCacheKey('recent-submissions', { role: session.user.role });
    
    // Check cache first
    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get recent submissions using optimized field selection
    const recentSubmissions = await prisma.submission.findMany({
      where: {},
      orderBy: {
        created_at: 'desc'
      },
      take: 10,
      select: submissionSelectList
    });

    const response = NextResponse.json(recentSubmissions);
    
    // Cache for 1 minute with tags
    responseCache.set(
      cacheKey, 
      response, 
      CacheTTL.MEDIUM,
      [CacheTags.SUBMISSIONS, CacheTags.DASHBOARD]
    );

    return response;

  } catch (error) {
    console.error("[DASHBOARD_RECENT_SUBMISSIONS]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}