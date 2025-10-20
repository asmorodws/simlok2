/**
 * Migration Script: Clear All Old Sessions
 * Run this once after deploying the new session management system
 * to clean up all old sessions that don't have proper sessionToken tracking
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllSessions() {
  console.log('🧹 Starting session cleanup...');
  
  try {
    // Delete all existing sessions
    const result = await prisma.session.deleteMany({});
    console.log(`✅ Deleted ${result.count} old sessions from database`);
    
    // Reset all users' session-related fields
    const userUpdate = await prisma.user.updateMany({
      data: {
        lastActiveAt: null,
        sessionExpiry: null,
      },
    });
    console.log(`✅ Reset session fields for ${userUpdate.count} users`);
    
    // Delete all refresh tokens
    const tokenResult = await prisma.refreshToken.deleteMany({});
    console.log(`✅ Deleted ${tokenResult.count} refresh tokens`);
    
    console.log('\n✅ Session cleanup completed!');
    console.log('📌 All users will need to login again with the new session system.');
    
  } catch (error) {
    console.error('❌ Error during session cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
clearAllSessions()
  .then(() => {
    console.log('\n🎉 Migration successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
