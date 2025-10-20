/**
 * API Route: Admin - Get Active Sessions
 * Returns list of active sessions for monitoring
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionService } from '@/services/session.service';
import { prisma } from '@/lib/singletons';

export async function GET() {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    // Only SUPER_ADMIN and ADMIN can view active sessions
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          error: 'Not authorized',
        },
        { status: 403 }
      );
    }

    // Get all active sessions with user info
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const activeSessions = await prisma.session.findMany({
      where: {
        expires: { gt: now },
        lastActivityAt: { gt: fiveMinutesAgo },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            officer_name: true,
            vendor_name: true,
            role: true,
            lastActiveAt: true,
          },
        },
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    // Get total active sessions count
    const totalCount = await SessionService.getActiveSessionsCount();

    return NextResponse.json({
      success: true,
      totalActiveSessions: totalCount,
      sessions: activeSessions.map((s) => ({
        id: s.id,
        sessionToken: s.sessionToken.substring(0, 10) + '...', // Partial token for security
        userId: s.userId,
        expires: s.expires,
        createdAt: s.createdAt,
        lastActivityAt: s.lastActivityAt,
        ipAddress: s.ipAddress,
        user: {
          id: s.user.id,
          email: s.user.email,
          officer_name: s.user.officer_name,
          vendor_name: s.user.vendor_name,
          role: s.user.role,
        },
      })),
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get active sessions',
      },
      { status: 500 }
    );
  }
}
