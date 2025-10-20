/**
 * API Route: Session Validation
 * Validates the current session and returns session status
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
          isValid: false,
          reason: 'No authentication token found',
        },
        { status: 401 }
      );
    }

    const sessionToken = (token as any).sessionToken as string | undefined;

    if (!sessionToken) {
      return NextResponse.json(
        {
          isValid: false,
          reason: 'No session token found',
        },
        { status: 401 }
      );
    }

    // Validate session
    const validation = await SessionService.validateSession(sessionToken);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          isValid: false,
          reason: validation.reason,
          shouldLogout: true,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      isValid: true,
      user: {
        id: validation.user!.id,
        email: validation.user!.email,
        role: validation.user!.role,
        officer_name: validation.user!.officer_name,
        isActive: validation.user!.isActive,
      },
      session: {
        expires: validation.session!.expires,
        lastActivity: validation.session!.lastActivityAt,
      },
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      {
        isValid: false,
        reason: 'Session validation failed',
      },
      { status: 500 }
    );
  }
}
