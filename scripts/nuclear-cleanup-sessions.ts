/**
 * NUCLEAR SESSION CLEANUP
 * 
 * ⚠️  WARNING: This will DELETE ALL SESSIONS and LOGOUT ALL USERS!
 * 
 * Use this ONLY when:
 * - Migrating to new session system
 * - Experiencing major session corruption
 * - Need to force all users to re-login
 * 
 * Usage:
 *   npx tsx scripts/nuclear-cleanup-sessions.ts
 * 
 * This script will ask for confirmation before proceeding.
 */

import { SessionService } from '../src/services/session.service';
import * as readline from 'readline';

async function askConfirmation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  WARNING: This will DELETE ALL SESSIONS and LOGOUT ALL USERS!\n\nType "DELETE ALL SESSIONS" to confirm: ',
      (answer) => {
        rl.close();
        resolve(answer.trim() === 'DELETE ALL SESSIONS');
      }
    );
  });
}

async function main() {
  console.log('💣 NUCLEAR SESSION CLEANUP');
  console.log('==========================\n');

  const confirmed = await askConfirmation();

  if (!confirmed) {
    console.log('\n❌ Cleanup cancelled. No sessions were deleted.');
    process.exit(0);
  }

  console.log('\n🧹 Starting NUCLEAR cleanup...\n');

  try {
    // Count before cleanup
    const beforeCount = await SessionService.getActiveSessionsCount();
    console.log(`Sessions before cleanup: ${beforeCount}`);

    // NUCLEAR OPTION: Delete ALL sessions
    const deletedCount = await SessionService.cleanupAllSessions();

    // Count after cleanup
    const afterCount = await SessionService.getActiveSessionsCount();

    console.log('\n✅ NUCLEAR cleanup completed!');
    console.log('\nSummary:');
    console.log(`   - Sessions before: ${beforeCount}`);
    console.log(`   - Sessions deleted: ${deletedCount}`);
    console.log(`   - Sessions after: ${afterCount}`);
    console.log('\n⚠️  All users have been logged out and must re-login.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during nuclear cleanup:', error);
    process.exit(1);
  }
}

main();
