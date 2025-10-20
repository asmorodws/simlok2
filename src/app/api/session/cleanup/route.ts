/**
 * API Route: Cleanup Sessions
 * Periodic cleanup of expired and idle sessions
 * Should be called by a cron job or scheduled task
 */

import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/session.service';

export async function POST(request: NextRequest) {
  try {
    // Verify request is authorized (e.g., from cron job with secret key)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Cleanup expired sessions
    const expiredCount = await SessionService.cleanupExpiredSessions();

    // Cleanup idle sessions
    const idleCount = await SessionService.cleanupIdleSessions();

    return NextResponse.json({
      success: true,
      message: 'Session cleanup completed',
      expiredSessionsDeleted: expiredCount,
      idleSessionsDeleted: idleCount,
      totalDeleted: expiredCount + idleCount,
    });
  } catch (error) {
    console.error('Session cleanup error:', error);
    return NextResponse.json(
      {
        error: 'Session cleanup failed',
      },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing (only in development)
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      {
        error: 'Not available in production',
      },
      { status: 403 }
    );
  }

  try {
    const expiredCount = await SessionService.cleanupExpiredSessions();
    const idleCount = await SessionService.cleanupIdleSessions();

    return NextResponse.json({
      success: true,
      message: 'Session cleanup completed (dev mode)',
      expiredSessionsDeleted: expiredCount,
      idleSessionsDeleted: idleCount,
      totalDeleted: expiredCount + idleCount,
    });
  } catch (error) {
    console.error('Session cleanup error:', error);
    return NextResponse.json(
      {
        error: 'Session cleanup failed',
      },
      { status: 500 }
    );
  }
}
