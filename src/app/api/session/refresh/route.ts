/**
 * API Route: Session Refresh
 * Extends the current session expiry time
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SessionService } from '@/services/session.service';

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'fallback-secret',
    });

    if (!token || !token.sub) {
      return NextResponse.json(
        {
          success: false,
          message: 'No authentication token found',
        },
        { status: 401 }
      );
    }

    const sessionToken = (token as any).sessionToken as string | undefined;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          message: 'No session token found',
        },
        { status: 401 }
      );
    }

    // Refresh session
    const success = await SessionService.refreshSession(sessionToken);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to refresh session',
        },
        { status: 400 }
      );
    }

    // Get updated session info
    const validation = await SessionService.validateSession(sessionToken);

    return NextResponse.json({
      success: true,
      message: 'Session refreshed successfully',
      expires: validation.session?.expires,
    });
  } catch (error) {
    console.error('Session refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Session refresh failed',
      },
      { status: 500 }
    );
  }
}
