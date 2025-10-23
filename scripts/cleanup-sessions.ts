/**
 * Session Cleanup Script
 * 
 * Purpose: Clean up old, expired, and orphaned sessions from database
 * 
 * Usage:
 *   npx tsx scripts/cleanup-sessions.ts
 * 
 * Run this script:
 * - After deployment
 * - Via cron job (recommended: hourly)
 * - When experiencing session issues
 * - Before major migrations
 */

import { SessionService } from '../src/services/session.service';

async function main() {
  console.log('🧹 Starting session cleanup...\n');

  try {
    // 1. Cleanup expired sessions
    console.log('Step 1: Cleaning up expired sessions...');
    const expiredCount = await SessionService.cleanupExpiredSessions();
    console.log(`   ✅ Deleted ${expiredCount} expired sessions\n`);

    // 2. Cleanup idle sessions
    console.log('Step 2: Cleaning up idle sessions...');
    const idleCount = await SessionService.cleanupIdleSessions();
    console.log(`   ✅ Deleted ${idleCount} idle sessions\n`);

    // 3. Get active sessions count
    console.log('Step 3: Checking active sessions...');
    const activeCount = await SessionService.getActiveSessionsCount();
    console.log(`   ℹ️  ${activeCount} active sessions remaining\n`);

    console.log('✅ Session cleanup completed successfully!');
    console.log('\nSummary:');
    console.log(`   - Expired sessions deleted: ${expiredCount}`);
    console.log(`   - Idle sessions deleted: ${idleCount}`);
    console.log(`   - Active sessions remaining: ${activeCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

main();
