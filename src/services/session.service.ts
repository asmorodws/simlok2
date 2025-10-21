/**
 * Session Service - Centralized session management
 * Best practices implementation for NextAuth + Database sessions
 */

import { prisma } from '@/lib/singletons';
import { User_role, VerificationStatus } from '@prisma/client';
import crypto from 'crypto';

export interface SessionData {
  id: string;
  userId: string;
  sessionToken: string;
  expires: Date;
  createdAt: Date;
  lastActivityAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface UserSessionInfo {
  id: string;
  email: string;
  role: User_role;
  officer_name: string;
  vendor_name: string | null;
  verified_at: Date | null;
  verification_status: VerificationStatus;
  isActive: boolean;
}

export interface SessionValidationResult {
  isValid: boolean;
  user?: UserSessionInfo;
  session?: SessionData;
  reason?: string;
}

export class SessionService {
  // Session configuration
  private static readonly SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in ms
  private static readonly SESSION_IDLE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours idle timeout
  private static readonly SESSION_ABSOLUTE_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days absolute timeout
  private static readonly ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; // Update activity every 5 minutes

  /**
   * Create a new session in database
   */
  static async createSession(
    userId: string,
    expiresInMs: number = this.SESSION_MAX_AGE,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<SessionData> {
    try {
      const sessionToken = this.generateSecureToken();
      const now = new Date();
      const expires = new Date(now.getTime() + expiresInMs);

      // Clean up old sessions for this user (keep only last 5)
      await this.cleanupUserSessions(userId, 5);

      const session = await prisma.session.create({
        data: {
          sessionToken,
          userId,
          expires,
          createdAt: now,
          lastActivityAt: now,
          ipAddress: metadata?.ipAddress || null,
          userAgent: metadata?.userAgent || null,
        },
      });

      return {
        id: session.id,
        userId: session.userId,
        sessionToken: session.sessionToken,
        expires: session.expires,
        createdAt: session.createdAt || now,
        lastActivityAt: session.lastActivityAt || now,
        ipAddress: session.ipAddress || null,
        userAgent: session.userAgent || null,
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Validate session and get user data
   */
  static async validateSession(sessionToken: string): Promise<SessionValidationResult> {
    try {
      const now = new Date();

      // Find session with user data
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              officer_name: true,
              vendor_name: true,
              verified_at: true,
              verification_status: true,
              isActive: true,
              lastActiveAt: true,
              created_at: true,
            },
          },
        },
      });

      // Session not found
      if (!session) {
        return {
          isValid: false,
          reason: 'Session not found',
        };
      }

      // Session expired
      if (session.expires < now) {
        await this.deleteSession(sessionToken);
        return {
          isValid: false,
          reason: 'Session expired',
        };
      }

      // Check idle timeout
      const lastActivity = session.lastActivityAt || session.createdAt || now;
      const idleTime = now.getTime() - lastActivity.getTime();
      if (idleTime > this.SESSION_IDLE_TIMEOUT) {
        await this.deleteSession(sessionToken);
        return {
          isValid: false,
          reason: 'Session idle timeout',
        };
      }

      // Check absolute timeout (from creation)
      const sessionAge = now.getTime() - (session.createdAt?.getTime() || 0);
      if (sessionAge > this.SESSION_ABSOLUTE_TIMEOUT) {
        await this.deleteSession(sessionToken);
        return {
          isValid: false,
          reason: 'Session absolute timeout reached',
        };
      }

      // User not found (shouldn't happen with foreign key, but check anyway)
      if (!session.user) {
        await this.deleteSession(sessionToken);
        return {
          isValid: false,
          reason: 'User not found',
        };
      }

      // User account is deactivated
      if (!session.user.isActive) {
        await this.deleteSession(sessionToken);
        return {
          isValid: false,
          reason: 'User account is deactivated',
        };
      }

      // Update activity timestamp (throttled)
      const timeSinceLastUpdate = now.getTime() - lastActivity.getTime();
      if (timeSinceLastUpdate > this.ACTIVITY_UPDATE_INTERVAL) {
        await this.updateSessionActivity(sessionToken);
      }

      return {
        isValid: true,
        user: session.user,
        session: {
          id: session.id,
          userId: session.userId,
          sessionToken: session.sessionToken,
          expires: session.expires,
          createdAt: session.createdAt || now,
          lastActivityAt: session.lastActivityAt || now,
          ipAddress: session.ipAddress || null,
          userAgent: session.userAgent || null,
        },
      };
    } catch (error) {
      console.error('Error validating session:', error);
      return {
        isValid: false,
        reason: 'Session validation error',
      };
    }
  }

  /**
   * Update session activity timestamp
   */
  static async updateSessionActivity(sessionToken: string): Promise<void> {
    try {
      await prisma.session.update({
        where: { sessionToken },
        data: { lastActivityAt: new Date() },
      });
    } catch (error) {
      // Silently fail - this is not critical
      console.error('Error updating session activity:', error);
    }
  }

  /**
   * Extend session expiry
   */
  static async extendSession(
    sessionToken: string,
    additionalTimeMs: number = this.SESSION_MAX_AGE
  ): Promise<boolean> {
    try {
      const session = await prisma.session.findUnique({
        where: { sessionToken },
      });

      if (!session) return false;

      const newExpiry = new Date(Date.now() + additionalTimeMs);

      await prisma.session.update({
        where: { sessionToken },
        data: {
          expires: newExpiry,
          lastActivityAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }

  /**
   * Delete a specific session
   */
  static async deleteSession(sessionToken: string): Promise<void> {
    try {
      // Use deleteMany instead of delete to avoid P2025 error when record doesn't exist
      const result = await prisma.session.deleteMany({
        where: { sessionToken },
      });
      
      if (result.count === 0) {
        console.log(`⚠️ Session not found for deletion: ${sessionToken.substring(0, 10)}...`);
      } else {
        console.log(`✅ Session deleted successfully: ${sessionToken.substring(0, 10)}...`);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      // Don't throw - just log the error
    }
  }

  /**
   * Delete all sessions for a user
   */
  static async deleteAllUserSessions(userId: string): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: { userId },
      });

      // Also update user's lastActiveAt
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: null, sessionExpiry: null },
      });
    } catch (error) {
      console.error('Error deleting user sessions:', error);
    }
  }

  /**
   * Cleanup expired sessions (should be run periodically)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();
      const result = await prisma.session.deleteMany({
        where: {
          expires: {
            lt: now,
          },
        },
      });

      console.log(`Cleaned up ${result.count} expired sessions`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  /**
   * Cleanup idle sessions
   */
  static async cleanupIdleSessions(): Promise<number> {
    try {
      const idleThreshold = new Date(Date.now() - this.SESSION_IDLE_TIMEOUT);
      const result = await prisma.session.deleteMany({
        where: {
          lastActivityAt: {
            lt: idleThreshold,
          },
        },
      });

      console.log(`Cleaned up ${result.count} idle sessions`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up idle sessions:', error);
      return 0;
    }
  }

  /**
   * Cleanup old sessions for a user (keep only N most recent)
   */
  static async cleanupUserSessions(userId: string, keepCount: number = 5): Promise<void> {
    try {
      // Get all sessions for user, ordered by creation date
      const sessions = await prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      // If more than keepCount, delete the oldest ones
      if (sessions.length > keepCount) {
        const sessionsToDelete = sessions.slice(keepCount);
        await prisma.session.deleteMany({
          where: {
            id: {
              in: sessionsToDelete.map((s) => s.id),
            },
          },
        });
      }
    } catch (error) {
      console.error('Error cleaning up user sessions:', error);
    }
  }

  /**
   * Get active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          expires: {
            gt: new Date(),
          },
        },
        orderBy: { lastActivityAt: 'desc' },
      });

      return sessions.map((s) => ({
        id: s.id,
        userId: s.userId,
        sessionToken: s.sessionToken,
        expires: s.expires,
        createdAt: s.createdAt || new Date(),
        lastActivityAt: s.lastActivityAt || new Date(),
        ipAddress: s.ipAddress || null,
        userAgent: s.userAgent || null,
      }));
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Get count of active sessions
   */
  static async getActiveSessionsCount(): Promise<number> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const count = await prisma.session.count({
        where: {
          expires: { gt: now },
          lastActivityAt: { gt: fiveMinutesAgo },
        },
      });

      return count;
    } catch (error) {
      console.error('Error getting active sessions count:', error);
      return 0;
    }
  }

  /**
   * Force logout a user by deleting all their sessions
   */
  static async forceLogout(userId: string, reason?: string): Promise<void> {
    console.log(`Force logout user ${userId}: ${reason || 'No reason provided'}`);
    await this.deleteAllUserSessions(userId);
  }

  /**
   * Generate a secure session token
   */
  private static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check if session is about to expire (for frontend warning)
   */
  static async checkSessionExpiry(sessionToken: string): Promise<{
    isExpiring: boolean;
    minutesRemaining: number;
    expiryTime: Date | null;
  }> {
    try {
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        select: { expires: true },
      });

      if (!session) {
        return {
          isExpiring: false,
          minutesRemaining: 0,
          expiryTime: null,
        };
      }

      const now = new Date();
      const minutesRemaining = Math.floor((session.expires.getTime() - now.getTime()) / (60 * 1000));

      return {
        isExpiring: minutesRemaining <= 10 && minutesRemaining > 0,
        minutesRemaining: Math.max(0, minutesRemaining),
        expiryTime: session.expires,
      };
    } catch (error) {
      console.error('Error checking session expiry:', error);
      return {
        isExpiring: false,
        minutesRemaining: 0,
        expiryTime: null,
      };
    }
  }

  /**
   * Refresh session - extend expiry and update activity
   */
  static async refreshSession(sessionToken: string): Promise<boolean> {
    try {
      const validation = await this.validateSession(sessionToken);
      
      if (!validation.isValid) {
        return false;
      }

      await this.extendSession(sessionToken);
      return true;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }
}
