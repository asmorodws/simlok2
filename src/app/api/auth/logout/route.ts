/**
 * API Route: Logout and Clear Session
 * Force logout user and clear all cookies and sessions
 * Database is the single source of truth - clean it first
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SessionService } from '@/services/session.service';
import { TokenManager } from '@/utils/token-manager';

export async function POST(request: NextRequest) {
  try {
    console.log('🚪 Logout request received');

    // Get current token if exists
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || 'fallback-secret',
    });

    const userId = token?.sub;
    const sessionToken = (token as any)?.sessionToken as string | undefined;

    let deletedCount = 0;

    // CRITICAL: Delete ALL user sessions from database (single source of truth)
    if (userId) {
      deletedCount = await SessionService.deleteAllUserSessions(userId);
      console.log(`✅ Deleted ${deletedCount} sessions for user: ${userId}`);
      
      // Also invalidate refresh tokens
      await TokenManager.invalidateAllUserTokens(userId);
      console.log(`✅ Invalidated refresh tokens for user: ${userId}`);
    } else if (sessionToken) {
      // Fallback: just delete the specific session if no userId
      await SessionService.deleteSession(sessionToken);
      console.log(`✅ Deleted specific session: ${sessionToken.substring(0, 10)}...`);
      deletedCount = 1;
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Berhasil logout',
      sessionsDeleted: deletedCount,
    });

    // Clear ALL NextAuth cookies
    const cookieOptions = { maxAge: 0, path: '/', httpOnly: true, sameSite: 'lax' as const };
    response.cookies.set('next-auth.session-token', '', cookieOptions);
    response.cookies.set('__Secure-next-auth.session-token', '', cookieOptions);
    response.cookies.set('next-auth.callback-url', '', cookieOptions);
    response.cookies.set('__Secure-next-auth.callback-url', '', cookieOptions);
    response.cookies.set('next-auth.csrf-token', '', cookieOptions);
    response.cookies.set('__Host-next-auth.csrf-token', '', cookieOptions);

    console.log('✅ Logout completed successfully');
    return response;
  } catch (error) {
    console.error('❌ Logout error:', error);
    
    // Still clear cookies even on error (fail-safe)
    const response = NextResponse.json({
      success: true,
      message: 'Berhasil logout',
      warning: 'Some cleanup operations failed',
    });

    const cookieOptions = { maxAge: 0, path: '/', httpOnly: true, sameSite: 'lax' as const };
    response.cookies.set('next-auth.session-token', '', cookieOptions);
    response.cookies.set('__Secure-next-auth.session-token', '', cookieOptions);
    response.cookies.set('next-auth.callback-url', '', cookieOptions);
    response.cookies.set('__Secure-next-auth.callback-url', '', cookieOptions);
    response.cookies.set('next-auth.csrf-token', '', cookieOptions);
    response.cookies.set('__Host-next-auth.csrf-token', '', cookieOptions);

    return response;
  }
}
