import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { formatScansDates } from '@/lib/timezone';
import { responseCache, CacheTTL, CacheTags, generateCacheKey } from '@/lib/response-cache';

const prisma = new PrismaClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow REVIEWER, APPROVER, ADMIN, SUPER_ADMIN to access scan history
    if (!['REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const submissionId = resolvedParams.id;

    // Try cache first (1 min TTL - scans are somewhat dynamic)
    const cacheKey = generateCacheKey('submission-scans', {
      submissionId,
    });

    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get scan history for the specific submission
    const scans = await prisma.qrScan.findMany({
      where: {
        submission_id: submissionId
      },
      include: {
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: {
        scanned_at: 'desc'
      }
    });

    // Convert scan timestamps to Asia/Jakarta for API consumers
    const formattedScans = formatScansDates(scans);
    const totalScans = formattedScans.length;
    const lastScan = formattedScans[0] || null;

    const response = NextResponse.json({
      scans: formattedScans,
      totalScans,
      lastScan,
      hasBeenScanned: totalScans > 0
    });

    // Cache for 1 minute (scans can update frequently)
    responseCache.set(
      cacheKey,
      response,
      CacheTTL.MEDIUM, // 1 minute
      [
        CacheTags.SUBMISSION_DETAIL,
        `submission:${submissionId}`,
      ]
    );

    return response;

  } catch (error) {
    console.error('Error fetching submission scan history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}