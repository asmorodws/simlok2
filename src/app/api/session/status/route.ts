/**
 * API Route: Session Status
 * Check if session is about to expire
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SessionService } from '@/services/session.service';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'fallback-secret',
    });

    if (!token || !token.sub) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    const sessionToken = (token as any).sessionToken as string | undefined;

    if (!sessionToken) {
      return NextResponse.json(
        {
          error: 'No session token',
        },
        { status: 401 }
      );
    }

    // Check session expiry
    const expiryInfo = await SessionService.checkSessionExpiry(sessionToken);

    return NextResponse.json({
      isExpiring: expiryInfo.isExpiring,
      minutesRemaining: expiryInfo.minutesRemaining,
      expiryTime: expiryInfo.expiryTime,
    });
  } catch (error) {
    console.error('Session status check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check session status',
      },
      { status: 500 }
    );
  }
}
