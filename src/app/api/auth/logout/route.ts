/**
 * API Route: Logout and Clear Session
 * Force logout user and clear all cookies and sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SessionService } from '@/services/session.service';
import { TokenManager } from '@/utils/token-manager';

export async function POST(request: NextRequest) {
  try {
    // Get current token if exists
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'fallback-secret',
    });

    const userId = token?.sub;
    const sessionToken = (token as any)?.sessionToken as string | undefined;

    // Delete database session
    if (sessionToken) {
      await SessionService.deleteSession(sessionToken);
    }

    // Delete all user sessions
    if (userId) {
      await SessionService.deleteAllUserSessions(userId);
      await TokenManager.invalidateAllUserTokens(userId);
    }

    // Create response with cleared cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear all NextAuth cookies
    const cookieOptions = { maxAge: 0, path: '/' };
    response.cookies.set('next-auth.session-token', '', cookieOptions);
    response.cookies.set('__Secure-next-auth.session-token', '', cookieOptions);
    response.cookies.set('next-auth.callback-url', '', cookieOptions);
    response.cookies.set('__Secure-next-auth.callback-url', '', cookieOptions);
    response.cookies.set('next-auth.csrf-token', '', cookieOptions);
    response.cookies.set('__Host-next-auth.csrf-token', '', cookieOptions);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear cookies even on error
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    const cookieOptions = { maxAge: 0, path: '/' };
    response.cookies.set('next-auth.session-token', '', cookieOptions);
    response.cookies.set('__Secure-next-auth.session-token', '', cookieOptions);
    response.cookies.set('next-auth.callback-url', '', cookieOptions);
    response.cookies.set('__Secure-next-auth.callback-url', '', cookieOptions);
    response.cookies.set('next-auth.csrf-token', '', cookieOptions);
    response.cookies.set('__Host-next-auth.csrf-token', '', cookieOptions);

    return response;
  }
}
