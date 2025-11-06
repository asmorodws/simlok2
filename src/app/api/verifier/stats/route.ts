import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { responseCache, CacheTTL, CacheTags, generateCacheKey } from '@/lib/response-cache';
import { parallelQueries } from '@/lib/db-optimizer';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'VERIFIER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Try cache first (2 minutes TTL)
    const cacheKey = generateCacheKey('verifier-stats', { userId: session.user.id });
    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get today's date range (Jakarta timezone)
    const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const today = new Date(jakartaNow);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Execute all queries in parallel
    const [
      totalScans,
      todayScans,
      totalSubmissions,
      approvedSubmissions,
      pendingSubmissions,
      rejectedSubmissions
    ] = await parallelQueries([
      () => prisma.qrScan.count({
        where: {
          scanned_by: session.user.id
        }
      }),
      
      () => prisma.qrScan.count({
        where: {
          scanned_by: session.user.id,
          scanned_at: {
            gte: todayStart,
            lt: todayEnd
          }
        }
      }),
      
      () => prisma.submission.count(),
      
      () => prisma.submission.count({
        where: {
          approval_status: 'APPROVED'
        }
      }),
      
      () => prisma.submission.count({
        where: {
          approval_status: 'PENDING_APPROVAL'
        }
      }),
      
      () => prisma.submission.count({
        where: {
          approval_status: 'REJECTED'
        }
      })
    ]);

    const stats = {
      totalScans,
      todayScans,
      totalSubmissions,
      approvedSubmissions,
      pendingSubmissions,
      rejectedSubmissions
    };

    const response = NextResponse.json(stats);

    // Cache for 2 minutes
    responseCache.set(
      cacheKey,
      response,
      CacheTTL.MEDIUM * 2,
      [CacheTags.QR_SCANS, CacheTags.DASHBOARD, `verifier-${session.user.id}`]
    );

    return response;

  } catch (error) {
    console.error('Error fetching verifier stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}