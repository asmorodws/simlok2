/**
 * Session Service - Centralized session management
 * Single Source of Truth: Database Only
 * 
 * Key Principles:
 * 1. Database is the ONLY source of truth for sessions
 * 2. JWT tokens are just identifiers to database sessions
 * 3. Every request MUST validate against database
 * 4. No session data stored in JWT (only sessionToken reference)
 * 5. Auto-cleanup of expired/orphaned sessions
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
  created_at: Date;
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
  private static readonly MAX_SESSIONS_PER_USER = 5; // Limit concurrent sessions per user
  
  // 🚀 PERFORMANCE: In-memory cache for session validation (30 seconds TTL)
  // Prevents redundant DB queries when multiple requests come simultaneously
  private static readonly VALIDATION_CACHE_TTL = 30 * 1000; // 30 seconds
  private static validationCache = new Map<string, {
    result: SessionValidationResult;
    timestamp: number;
  }>();
  
  // 🚀 PERFORMANCE: Logging throttle to prevent console spam
  private static readonly LOG_THROTTLE_INTERVAL = 30 * 1000; // 30 seconds
  private static lastLogTime = new Map<string, number>();

  /**
   * Create a new session in database
   * This is the ONLY way to create a valid session
   * Automatically limits concurrent sessions per user
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

      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isActive: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('User account is deactivated');
      }

      // Clean up old sessions BEFORE creating new one (keep only N-1 most recent)
      await this.cleanupUserSessions(userId, this.MAX_SESSIONS_PER_USER - 1);

      // Create new session
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

      console.log(`✅ Created new session for user ${userId}: ${sessionToken.substring(0, 10)}...`);

      // Update user's last active time
      await prisma.user.update({
        where: { id: userId },
        data: { 
          lastActiveAt: now,
          sessionExpiry: expires
        }
      }).catch(err => {
        console.error('Error updating user lastActiveAt:', err);
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
      console.error('❌ Error creating session:', error);
      throw error;
    }
  }

  /**
   * 🚀 PERFORMANCE OPTIMIZED: Validate session with in-memory caching
   * 
   * This is called on EVERY request, so we cache results for 30 seconds
   * to prevent redundant DB queries when multiple requests come simultaneously.
   * 
   * Example: User loads dashboard with 8 resources (JS, CSS, API calls)
   * - WITHOUT cache: 8 requests × 3 validations (middleware + JWT + session) = 24 DB queries 🔥
   * - WITH cache: First request hits DB, next 7 requests use cache = 1 DB query ✅
   * 
   * Database is still the single source of truth - cache just reduces latency.
   */
  static async validateSession(sessionToken: string): Promise<SessionValidationResult> {
    try {
      const now = new Date();
      const cacheKey = sessionToken;
      
      // 🚀 CHECK CACHE FIRST (30 second TTL)
      const cached = this.validationCache.get(cacheKey);
      if (cached && (now.getTime() - cached.timestamp) < this.VALIDATION_CACHE_TTL) {
        // Throttled logging to reduce console spam
        this.throttledLog(
          `cache-hit-${sessionToken}`,
          () => console.log(`⚡ Cache hit for session validation (${cached.result.user?.email})`)
        );
        return cached.result;
      }

      // 🔍 CACHE MISS - Query database
      this.throttledLog(
        `cache-miss-${sessionToken}`,
        () => console.log(`🔍 Cache miss - querying database for session validation`)
      );

      // Find session with user data in ONE query (performance optimization)
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

      // Session not found in database = INVALID
      if (!session) {
        const result = {
          isValid: false,
          reason: 'Session tidak ditemukan di database',
        };
        
        // Cache negative results for shorter time (5 seconds)
        this.validationCache.set(cacheKey, {
          result,
          timestamp: now.getTime() - (this.VALIDATION_CACHE_TTL - 5000),
        });
        
        this.throttledLog(
          `session-not-found-${sessionToken}`,
          () => console.log(`❌ Session validation failed: Session not found in database`)
        );
        return result;
      }

      // Session expired = INVALID (delete it)
      if (session.expires < now) {
        this.validationCache.delete(cacheKey); // Remove from cache
        await this.deleteSession(sessionToken);
        
        this.throttledLog(
          `session-expired-${sessionToken}`,
          () => console.log(`❌ Session expired: ${sessionToken.substring(0, 10)}...`)
        );
        
        return {
          isValid: false,
          reason: 'Session telah kadaluarsa',
        };
      }

      // Check idle timeout (last activity too long ago)
      const lastActivity = session.lastActivityAt || session.createdAt || now;
      const idleTime = now.getTime() - lastActivity.getTime();
      if (idleTime > this.SESSION_IDLE_TIMEOUT) {
        this.validationCache.delete(cacheKey); // Remove from cache
        await this.deleteSession(sessionToken);
        
        this.throttledLog(
          `session-idle-${sessionToken}`,
          () => console.log(`❌ Session idle timeout: ${Math.round(idleTime / 60000)} minutes`)
        );
        
        return {
          isValid: false,
          reason: 'Session tidak aktif terlalu lama (idle timeout)',
        };
      }

      // Check absolute timeout (session age too old)
      const sessionAge = now.getTime() - (session.createdAt?.getTime() || 0);
      if (sessionAge > this.SESSION_ABSOLUTE_TIMEOUT) {
        this.validationCache.delete(cacheKey); // Remove from cache
        await this.deleteSession(sessionToken);
        
        this.throttledLog(
          `session-absolute-timeout-${sessionToken}`,
          () => console.log(`❌ Session absolute timeout: ${Math.round(sessionAge / 86400000)} days old`)
        );
        
        return {
          isValid: false,
          reason: 'Session telah melewati batas waktu maksimum',
        };
      }

      // User not found (foreign key should prevent this, but check anyway)
      if (!session.user) {
        this.validationCache.delete(cacheKey); // Remove from cache
        await this.deleteSession(sessionToken);
        
        this.throttledLog(
          `user-not-found-${sessionToken}`,
          () => console.log(`❌ User not found for session`)
        );
        
        return {
          isValid: false,
          reason: 'User tidak ditemukan',
        };
      }

      // User account is deactivated = INVALID (delete session)
      if (!session.user.isActive) {
        this.validationCache.delete(cacheKey); // Remove from cache
        await this.deleteSession(sessionToken);
        
        this.throttledLog(
          `user-deactivated-${session.user.email}`,
          () => console.log(`❌ User account deactivated: ${session.user.email}`)
        );
        
        return {
          isValid: false,
          reason: 'Akun telah dinonaktifkan',
        };
      }

      // ✅ ALL CHECKS PASSED - Session is VALID
      
      // Update activity timestamp (throttled to reduce DB writes)
      const timeSinceLastUpdate = now.getTime() - lastActivity.getTime();
      if (timeSinceLastUpdate > this.ACTIVITY_UPDATE_INTERVAL) {
        // Fire and forget - don't await to prevent blocking
        this.updateSessionActivity(sessionToken).catch(err => {
          console.error('Warning: Failed to update session activity:', err);
        });
      }

      // Throttled success logging
      this.throttledLog(
        `session-valid-${session.user.email}`,
        () => console.log(`✅ Session valid for user: ${session.user.email}`)
      );

      const result: SessionValidationResult = {
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

      // 🚀 CACHE THE RESULT for 30 seconds
      this.validationCache.set(cacheKey, {
        result,
        timestamp: now.getTime(),
      });

      return result;
    } catch (error) {
      console.error('❌ Error validating session:', error);
      return {
        isValid: false,
        reason: 'Terjadi kesalahan saat validasi session',
      };
    }
  }

  /**
   * 🚀 PERFORMANCE: Throttled logging to prevent console spam
   * Only logs once per LOG_THROTTLE_INTERVAL (30 seconds) for the same key
   */
  private static throttledLog(key: string, logFn: () => void): void {
    const now = Date.now();
    const lastLog = this.lastLogTime.get(key) || 0;
    
    if (now - lastLog > this.LOG_THROTTLE_INTERVAL) {
      logFn();
      this.lastLogTime.set(key, now);
    }
  }

  /**
   * 🚀 PERFORMANCE: Clear validation cache for a session
   * Called when session is modified (logout, delete, etc)
   */
  private static clearValidationCache(sessionToken: string): void {
    this.validationCache.delete(sessionToken);
  }

  /**
   * 🚀 PERFORMANCE: Cleanup old cache entries periodically
   * Call this in a background job or on app startup
   */
  static cleanupValidationCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.validationCache.forEach((value, key) => {
      if (now - value.timestamp > this.VALIDATION_CACHE_TTL) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.validationCache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
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
   * Delete a specific session from database
   * Called when session is invalid, expired, or user logs out
   */
  static async deleteSession(sessionToken: string): Promise<void> {
    try {
      // 🚀 Clear cache first
      this.clearValidationCache(sessionToken);
      
      // Use deleteMany to avoid P2025 error if record doesn't exist
      const result = await prisma.session.deleteMany({
        where: { sessionToken },
      });
      
      if (result.count === 0) {
        this.throttledLog(
          `delete-not-found-${sessionToken}`,
          () => console.log(`⚠️  Session not found for deletion: ${sessionToken.substring(0, 10)}...`)
        );
      } else {
        this.throttledLog(
          `delete-success-${sessionToken}`,
          () => console.log(`✅ Session deleted: ${sessionToken.substring(0, 10)}...`)
        );
      }
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      // Don't throw - session deletion should not break the flow
    }
  }

  /**
   * Delete all sessions for a user
   * Called on logout, password change, or account deactivation
   */
  static async deleteAllUserSessions(userId: string): Promise<number> {
    try {
      // 🚀 Clear all cache entries for this user's sessions
      const userSessions = await prisma.session.findMany({
        where: { userId },
        select: { sessionToken: true },
      });
      
      userSessions.forEach(session => {
        this.clearValidationCache(session.sessionToken);
      });

      const result = await prisma.session.deleteMany({
        where: { userId },
      });

      console.log(`✅ Deleted ${result.count} sessions for user: ${userId}`);

      // Clear user's session-related fields
      await prisma.user.update({
        where: { id: userId },
        data: { 
          lastActiveAt: null, 
          sessionExpiry: null 
        }
      }).catch(err => {
        console.error('Warning: Failed to clear user session fields:', err);
      });

      return result.count;
    } catch (error) {
      console.error('❌ Error deleting user sessions:', error);
      return 0;
    }
  }

  /**
   * Cleanup expired sessions
   * Should be run periodically via cron job
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

      if (result.count > 0) {
        console.log(`🧹 Cleaned up ${result.count} expired sessions`);
        
        // 🚀 Also cleanup validation cache
        this.cleanupValidationCache();
      }
      return result.count;
    } catch (error) {
      console.error('❌ Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  /**
   * Cleanup idle sessions
   * Should be run periodically via cron job
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

      if (result.count > 0) {
        console.log(`🧹 Cleaned up ${result.count} idle sessions`);
      }
      return result.count;
    } catch (error) {
      console.error('❌ Error cleaning up idle sessions:', error);
      return 0;
    }
  }

  /**
   * Cleanup old sessions for a user (keep only N most recent)
   * Called automatically when creating new session
   */
  static async cleanupUserSessions(userId: string, keepCount: number = 5): Promise<void> {
    try {
      // Get all sessions for user, ordered by most recent
      const sessions = await prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, sessionToken: true },
      });

      // If more than keepCount, delete the oldest ones
      if (sessions.length > keepCount) {
        const sessionsToDelete = sessions.slice(keepCount);
        const deleteCount = await prisma.session.deleteMany({
          where: {
            id: {
              in: sessionsToDelete.map((s) => s.id),
            },
          },
        });
        
        if (deleteCount.count > 0) {
          console.log(`🧹 Cleaned up ${deleteCount.count} old sessions for user ${userId}`);
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up user sessions:', error);
    }
  }

  /**
   * Cleanup ALL sessions (nuclear option for maintenance)
   * Use with caution - will logout all users!
   */
  static async cleanupAllSessions(): Promise<number> {
    try {
      const result = await prisma.session.deleteMany({});
      
      // Reset all users' session fields
      await prisma.user.updateMany({
        data: {
          lastActiveAt: null,
          sessionExpiry: null,
        }
      });

      console.log(`🧹 NUCLEAR CLEANUP: Deleted ALL ${result.count} sessions`);
      return result.count;
    } catch (error) {
      console.error('❌ Error in nuclear cleanup:', error);
      return 0;
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
