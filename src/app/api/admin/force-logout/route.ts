/**
 * API Route: Admin - Force Logout User
 * Allows admin to force logout a specific user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/security/auth';
import { SessionService } from '@/services/session.service';
import { prisma } from '@/lib/database';

export async function POST(request: NextRequest) {
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

    // Only SUPER_ADMIN, ADMIN, and VERIFIER can force logout
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'VERIFIER'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        {
          error: 'Not authorized',
        },
        { status: 403 }
      );
    }

    // Get user ID from request body
    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID is required',
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, officer_name: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Force logout the user
    await SessionService.forceLogout(
      userId,
      reason || `Forced logout by ${session.user.officer_name}`
    );

    console.log(`User ${user.email} force logged out by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: `User ${user.officer_name} has been logged out`,
      user: {
        id: user.id,
        email: user.email,
        officer_name: user.officer_name,
      },
    });
  } catch (error) {
    console.error('Force logout error:', error);
    return NextResponse.json(
      {
        error: 'Failed to force logout user',
      },
      { status: 500 }
    );
  }
}
