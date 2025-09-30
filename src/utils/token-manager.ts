import { prisma } from '@/lib/singletons';
import { JWT_CONFIG } from './jwt-config';

export class TokenManager {
  /**
   * Cleanup expired refresh tokens
   */
  static async cleanupExpiredTokens() {
    try {
      const now = new Date();
      await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: now
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }

  /**
   * Rotate refresh token
   */
  static async rotateRefreshToken(userId: string, oldToken: string) {
    try {
      // Begin transaction
      const result = await prisma.$transaction(async (tx) => {
        // Invalidate old token
        await tx.refreshToken.delete({
          where: {
            token: oldToken,
            userId: userId
          }
        });

        // Create new token
        const newToken = await tx.refreshToken.create({
          data: {
            token: crypto.randomUUID(),
            userId: userId,
            expiresAt: new Date(Date.now() + JWT_CONFIG.SESSION_MAX_AGE * 1000)
          }
        });

        return newToken;
      });

      return result;
    } catch (error) {
      console.error('Error rotating refresh token:', error);
      throw error;
    }
  }

  /**
   * Invalidate all refresh tokens for a user
   */
  static async invalidateAllUserTokens(userId: string) {
    try {
      await prisma.refreshToken.deleteMany({
        where: {
          userId: userId
        }
      });
    } catch (error) {
      console.error('Error invalidating user tokens:', error);
      throw error;
    }
  }

  /**
   * Get valid refresh token
   */
  static async getValidRefreshToken(token: string) {
    try {
      const refreshToken = await prisma.refreshToken.findFirst({
        where: {
          token: token,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          user: true
        }
      });

      return refreshToken;
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }
}