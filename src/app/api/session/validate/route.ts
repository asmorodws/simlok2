/**
 * API Route: Session Validation
 * Validates the current session and returns session status
 */

import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SessionService } from '@/services/session.service';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'fallback-secret',
    });

    if (!token || !token.sub) {
      return unauthorizedResponse('No authentication token found');
    }

    const sessionToken = (token as any).sessionToken as string | undefined;

    if (!sessionToken) {
      return unauthorizedResponse('No session token found');
    }

    // Validate session
    const validation = await SessionService.validateSession(sessionToken);

    if (!validation.isValid) {
      return successResponse({
        isValid: false,
        reason: validation.reason,
        shouldLogout: true,
      }, {
        headers: { 'X-Should-Logout': 'true' },
      });
    }

    return successResponse({
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
    return internalErrorResponse('SESSION_VALIDATION', error);
  }
}
