/**
 * Session Validation Middleware
 * Auto-logout when session ID doesn't exist in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { toJakartaISOString } from '@/lib/timezone';

interface SessionValidationResult {
  isValid: boolean;
  userId?: string;
  sessionExpired?: boolean;
  shouldLogout?: boolean;
  reason?: string;
}

export class SessionValidationService {
  private static readonly EXCLUDED_PATHS = [
    '/api/auth',
    '/api/health',
    '/login',
    '/register',
    '/_next',
    '/favicon.ico',
  ];

  /**
   * Validate session against database
   */
  static async validateSession(request: NextRequest): Promise<SessionValidationResult> {
    try {
      // Get token from NextAuth
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET || 'fallback-secret'
      });

      if (!token || !token.sub) {
        return {
          isValid: false,
          shouldLogout: true,
          reason: 'No valid token found',
        };
      }

      const userId = token.sub;

      // Check if user exists in database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          isActive: true,
          verified_at: true,
          lastActiveAt: true,
          sessionExpiry: true,
        },
      });

      if (!user) {
        return {
          isValid: false,
          shouldLogout: true,
          reason: 'User not found in database',
        };
      }

      if (!user.isActive) {
        return {
          isValid: false,
          shouldLogout: true,
          reason: 'User account is deactivated',
        };
      }

      if (!user.verified_at) {
        return {
          isValid: false,
          shouldLogout: true,
          reason: 'User account is not verified',
        };
      }

      // Check session expiry if set
      if (user.sessionExpiry && new Date() > user.sessionExpiry) {
        return {
          isValid: false,
          shouldLogout: true,
          sessionExpired: true,
          reason: 'Session has expired',
        };
      }

      // Update last active timestamp
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      });

      return {
        isValid: true,
        userId: userId,
      };

    } catch (error) {
      console.error('Session validation error:', error);
      return {
        isValid: false,
        shouldLogout: true,
        reason: 'Session validation failed',
      };
    }
  }

  /**
   * Check if path should be excluded from session validation
   */
  static shouldExcludePath(pathname: string): boolean {
    return this.EXCLUDED_PATHS.some(path => pathname.startsWith(path));
  }

  /**
   * Create logout response with proper cleanup
   */
  static createLogoutResponse(request: NextRequest, reason?: string): NextResponse {
    const response = NextResponse.redirect(new URL('/login', request.url));
    
    // Clear NextAuth cookies
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    response.cookies.delete('next-auth.callback-url');
    response.cookies.delete('__Secure-next-auth.callback-url');

    // Add logout reason as query parameter
    if (reason) {
      const url = new URL('/login', request.url);
      url.searchParams.set('logout_reason', encodeURIComponent(reason));
      return NextResponse.redirect(url);
    }

    return response;
  }

  /**
   * Middleware function for automatic session validation
   */
  static async middleware(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // Skip validation for excluded paths
    if (this.shouldExcludePath(pathname)) {
      return NextResponse.next();
    }

    // Validate session
    const validation = await this.validateSession(request);

    if (!validation.isValid && validation.shouldLogout) {
      console.log(`Auto-logout triggered: ${validation.reason}`);
      return this.createLogoutResponse(request, validation.reason);
    }

    // Add user ID to request headers for downstream use
    if (validation.userId) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', validation.userId);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  }

  /**
   * Force logout user by clearing their session
   */
  static async forceLogout(userId: string, reason: string = 'Admin action'): Promise<void> {
    try {
      
      // Update user session expiry to force logout
      await prisma.user.update({
        where: { id: userId },
        data: {
          sessionExpiry: new Date(), // Set to current time to expire immediately
        },
      });

      console.log(`Force logout applied to user ${userId}: ${reason}`);
    } catch (error) {
      console.error('Force logout error:', error);
      throw error;
    }
  }

  /**
   * Extend user session
   */
  static async extendSession(
    userId: string, 
    extensionMinutes: number = 60
  ): Promise<void> {
    try {
      const newExpiry = new Date(Date.now() + extensionMinutes * 60 * 1000);
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          sessionExpiry: newExpiry,
        },
      });

  console.log(`Session extended for user ${userId} until ${toJakartaISOString(newExpiry) || newExpiry.toISOString()}`);
    } catch (error) {
      console.error('Session extension error:', error);
      throw error;
    }
  }

  /**
   * Check if session is about to expire (within warning threshold)
   */
  static async checkSessionExpiry(userId: string): Promise<{
    isExpiring: boolean;
    minutesRemaining?: number;
    expiryTime?: Date;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { sessionExpiry: true },
      });

      if (!user?.sessionExpiry) {
        return { isExpiring: false };
      }

      const now = new Date();
      const expiry = user.sessionExpiry;
      const minutesRemaining = Math.floor((expiry.getTime() - now.getTime()) / (60 * 1000));

      // Warn if session expires within 10 minutes
      const isExpiring = minutesRemaining <= 10 && minutesRemaining > 0;

      return {
        isExpiring,
        minutesRemaining: Math.max(0, minutesRemaining),
        expiryTime: expiry,
      };
    } catch (error) {
      console.error('Session expiry check error:', error);
      return { isExpiring: false };
    }
  }

  /**
   * Get active sessions count for admin dashboard
   */
  static async getActiveSessionsCount(): Promise<number> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      const count = await prisma.user.count({
        where: {
          isActive: true,
          lastActiveAt: {
            gte: fifteenMinutesAgo,
          },
        },
      });

      return count;
    } catch (error) {
      console.error('Active sessions count error:', error);
      return 0;
    }
  }
}

/**
 * API Route helper for session validation
 */
export async function validateApiSession(request: NextRequest): Promise<{
  isValid: boolean;
  userId?: string;
  error?: string;
}> {
  const validation = await SessionValidationService.validateSession(request);
  
  if (!validation.isValid) {
    return {
      isValid: false,
      error: validation.reason || 'Session invalid',
    };
  }

  return {
    isValid: true,
    userId: validation.userId!,
  };
}

/**
 * HOC for protecting API routes with session validation
 */
export function withSessionValidation(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: any): Promise<NextResponse> => {
    const validation = await validateApiSession(request);
    
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Session invalid', 
          message: validation.error,
          shouldLogout: true 
        },
        { status: 401 }
      );
    }

    // Add user ID to request for handler use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', validation.userId!);
    
    const enhancedRequest = new NextRequest(request.url, {
      ...request,
      headers: requestHeaders,
    });

    return handler(enhancedRequest, context);
  };
}