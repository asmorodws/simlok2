import { prisma } from '@/lib/singletons';

async function cleanupExpiredSessions() {
  const now = new Date();
  
  try {
    // Cleanup expired refresh tokens
    await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: now }
      }
    });

    // Cleanup expired sessions
    await prisma.session.deleteMany({
      where: {
        expires: { lt: now }
      }
    });

    console.log('Cleaned up expired sessions and tokens at:', now);
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// Export for manual triggers if needed
export { cleanupExpiredSessions };