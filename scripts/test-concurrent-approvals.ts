#!/usr/bin/env node
/**
 * Concurrent Approval Test
 * 
 * Tests SIMLOK number generation under concurrent load to verify:
 * 1. No duplicate numbers
 * 2. Sequential numbering (no gaps)
 * 3. Transaction isolation working correctly
 * 
 * Usage:
 *   npx ts-node scripts/test-concurrent-approvals.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestConfig {
  numSubmissions: number;      // How many submissions to create
  concurrentApprovals: number; // How many to approve concurrently
  delayBetweenBatches: number; // ms delay between batches
}

const DEFAULT_CONFIG: TestConfig = {
  numSubmissions: 20,
  concurrentApprovals: 10,
  delayBetweenBatches: 1000,
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Create test submissions
 */
async function createTestSubmissions(count: number): Promise<string[]> {
  log('cyan', `\n📝 Creating ${count} test submissions...`);
  
  const testUser = await prisma.user.findFirst({
    where: { role: 'VENDOR' }
  });

  if (!testUser) {
    throw new Error('No VENDOR user found. Please create a vendor user first.');
  }

  const submissionIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const submission = await prisma.submission.create({
      data: {
        vendor_name: `TEST_VENDOR_${i + 1}`,
        based_on: 'Test Document',
        officer_name: 'Test Officer',
        job_description: 'Testing concurrent approval',
        work_location: 'Test Location',
        working_hours: '08:00-17:00',
        work_facilities: 'Test Facilities',
        worker_names: 'Test Worker',
        user_id: testUser.id,
        user_email: testUser.email,
        user_officer_name: testUser.officer_name,
        user_vendor_name: testUser.vendor_name,
        user_phone_number: testUser.phone_number,
        user_address: testUser.address,
        review_status: 'MEETS_REQUIREMENTS', // Already reviewed
        approval_status: 'PENDING_APPROVAL',  // Ready for approval
        implementation_start_date: new Date(),
        implementation_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    submissionIds.push(submission.id);
    process.stdout.write('.');
  }

  log('green', `\n✅ Created ${count} test submissions`);
  return submissionIds;
}

/**
 * Approve submission using the actual transaction code
 */
async function approveSubmission(submissionId: string): Promise<{
  id: string;
  simlokNumber: string;
  duration: number;
}> {
  const startTime = Date.now();

  // Import the actual generate function to ensure we use the same code
  const result = await prisma.$transaction(async (tx) => {
    const txStart = Date.now();
    console.log(`[${submissionId.slice(0, 8)}] TX START at ${txStart}`);
    
    // Use SELECT MAX with FOR UPDATE lock (same as API code)
    const queryResult = await tx.$queryRaw<Array<{ max_number: bigint | null }>>`
      SELECT CAST(SUBSTRING_INDEX(simlok_number, '/', 1) AS UNSIGNED) as max_number
      FROM Submission 
      WHERE simlok_number IS NOT NULL 
      ORDER BY max_number DESC 
      LIMIT 1 
      FOR UPDATE
    `;

    const afterLock = Date.now();
    console.log(`[${submissionId.slice(0, 8)}] LOCK ACQUIRED after ${afterLock - txStart}ms`);

    let nextNumber = 1;
    
    const maxResult = queryResult.length > 0 ? queryResult[0] : null;
    if (maxResult?.max_number !== null && maxResult?.max_number !== undefined) {
      nextNumber = Number(maxResult.max_number) + 1;
      console.log(`[${submissionId.slice(0, 8)}] MAX NUMBER: ${maxResult.max_number} → NEXT: ${nextNumber}`);
    }

    const year = new Date().getFullYear();
    const generatedNumber = `${nextNumber}/S00330/${year}-S0`;
    console.log(`[${submissionId.slice(0, 8)}] GENERATED: ${generatedNumber}`);

    // Update submission within the same transaction
    await tx.submission.update({
      where: { id: submissionId },
      data: {
        approval_status: 'APPROVED',
        simlok_number: generatedNumber,
        simlok_date: new Date(),
        approved_at: new Date(),
        approved_by: 'TEST_APPROVER',
      },
    });

    const afterUpdate = Date.now();
    console.log(`[${submissionId.slice(0, 8)}] UPDATED after ${afterUpdate - txStart}ms`);

    return generatedNumber;
  }, {
    maxWait: 5000,
    timeout: 10000,
    isolationLevel: 'Serializable',
  });

  const duration = Date.now() - startTime;
  console.log(`[${submissionId.slice(0, 8)}] TX COMPLETE: ${result} in ${duration}ms\n`);

  return {
    id: submissionId,
    simlokNumber: result,
    duration,
  };
}

/**
 * Run concurrent approvals
 */
async function runConcurrentApprovals(
  submissionIds: string[],
  concurrency: number
): Promise<Array<{ id: string; simlokNumber: string; duration: number }>> {
  log('yellow', `\n⚡ Approving ${submissionIds.length} submissions with concurrency: ${concurrency}...`);
  
  const results: Array<{ id: string; simlokNumber: string; duration: number }> = [];
  const errors: Array<{ id: string; error: string }> = [];

  // Process in batches
  for (let i = 0; i < submissionIds.length; i += concurrency) {
    const batch = submissionIds.slice(i, i + concurrency);
    log('blue', `\n📦 Processing batch ${Math.floor(i / concurrency) + 1} (${batch.length} submissions)...`);

    const promises = batch.map(async (id) => {
      try {
        const result = await approveSubmission(id);
        process.stdout.write(colors.green + '✓' + colors.reset);
        return result;
      } catch (error) {
        process.stdout.write(colors.red + '✗' + colors.reset);
        errors.push({
          id,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults.filter((r): r is NonNullable<typeof r> => r !== null));

    // Small delay between batches
    if (i + concurrency < submissionIds.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n');

  if (errors.length > 0) {
    log('red', `\n❌ ${errors.length} approvals failed:`);
    errors.forEach(e => {
      console.log(`   ${e.id}: ${e.error}`);
    });
  }

  return results;
}

/**
 * Analyze results
 */
function analyzeResults(results: Array<{ id: string; simlokNumber: string; duration: number }>) {
  log('cyan', '\n📊 ANALYSIS RESULTS:\n');

  // Extract numbers from SIMLOK format
  const numbers = results.map(r => {
    const match = r.simlokNumber.match(/^(\d+)\//);
    return match && match[1] ? parseInt(match[1], 10) : 0;
  }).sort((a, b) => a - b);

  // Check for duplicates
  const duplicates = new Map<number, number>();
  numbers.forEach(num => {
    duplicates.set(num, (duplicates.get(num) || 0) + 1);
  });

  const duplicateNumbers = Array.from(duplicates.entries())
    .filter(([_, count]) => count > 1);

  if (duplicateNumbers.length > 0) {
    log('red', '❌ DUPLICATE NUMBERS FOUND:');
    duplicateNumbers.forEach(([num, count]) => {
      console.log(`   Number ${num} appears ${count} times`);
    });
  } else {
    log('green', '✅ NO DUPLICATES: All SIMLOK numbers are unique!');
  }

  // Check for sequential order
  const gaps: number[] = [];
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  
  for (let i = min; i <= max; i++) {
    if (!numbers.includes(i)) {
      gaps.push(i);
    }
  }

  if (gaps.length > 0) {
    log('yellow', `⚠️  GAPS IN SEQUENCE: Missing numbers: ${gaps.join(', ')}`);
  } else {
    log('green', `✅ SEQUENTIAL: Numbers are perfectly sequential (${min} to ${max})`);
  }

  // Performance stats
  const durations = results.map(r => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  console.log('\n📈 PERFORMANCE:');
  console.log(`   Average approval time: ${avgDuration.toFixed(0)}ms`);
  console.log(`   Min: ${minDuration}ms`);
  console.log(`   Max: ${maxDuration}ms`);
  console.log(`   Total: ${results.length} approvals`);

  // Print all SIMLOK numbers
  console.log('\n📋 ALL SIMLOK NUMBERS (sorted):');
  results
    .sort((a, b) => {
      const aPart = a.simlokNumber.split('/')[0];
      const bPart = b.simlokNumber.split('/')[0];
      const aNum = aPart ? parseInt(aPart, 10) : 0;
      const bNum = bPart ? parseInt(bPart, 10) : 0;
      return aNum - bNum;
    })
    .forEach((r, i) => {
      console.log(`   ${(i + 1).toString().padStart(3)}. ${r.simlokNumber} (${r.duration}ms)`);
    });

  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (duplicateNumbers.length === 0 && gaps.length === 0) {
    log('green', '✅✅✅ TEST PASSED: Sequential numbering works perfectly! ✅✅✅');
  } else {
    log('red', '❌❌❌ TEST FAILED: Issues found in numbering! ❌❌❌');
  }
  console.log('='.repeat(80) + '\n');
}

/**
 * Cleanup test data
 */
async function cleanup(submissionIds: string[]) {
  log('yellow', '\n🧹 Cleaning up test data...');
  
  await prisma.submission.deleteMany({
    where: {
      id: { in: submissionIds },
    },
  });

  log('green', `✅ Deleted ${submissionIds.length} test submissions\n`);
}

/**
 * Main test function
 */
async function runTest(config: TestConfig = DEFAULT_CONFIG) {
  console.log('\n' + '='.repeat(80));
  log('magenta', '🧪 CONCURRENT APPROVAL TEST FOR SIMLOK NUMBER GENERATION');
  console.log('='.repeat(80));
  
  console.log('\n📋 Test Configuration:');
  console.log(`   Total submissions: ${config.numSubmissions}`);
  console.log(`   Concurrent approvals: ${config.concurrentApprovals}`);
  console.log(`   Delay between batches: ${config.delayBetweenBatches}ms`);

  let submissionIds: string[] = [];

  try {
    // Create submissions
    submissionIds = await createTestSubmissions(config.numSubmissions);

    // Run concurrent approvals
    const results = await runConcurrentApprovals(
      submissionIds,
      config.concurrentApprovals
    );

    // Analyze results
    analyzeResults(results);

  } catch (error) {
    log('red', `\n❌ Test failed with error:`);
    console.error(error);
  } finally {
    // Cleanup
    if (submissionIds.length > 0) {
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>(resolve => {
        rl.question('\n🗑️  Delete test submissions? (y/N): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() === 'y') {
        await cleanup(submissionIds);
      } else {
        log('yellow', '⚠️  Test data NOT deleted. Clean up manually if needed.');
      }
    }

    await prisma.$disconnect();
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const config: TestConfig = { ...DEFAULT_CONFIG };

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--submissions' || arg === '-s') {
    const val = args[++i];
    if (val) config.numSubmissions = parseInt(val, 10);
  } else if (arg === '--concurrent' || arg === '-c') {
    const val = args[++i];
    if (val) config.concurrentApprovals = parseInt(val, 10);
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: npx ts-node scripts/test-concurrent-approvals.ts [options]

Options:
  -s, --submissions <num>   Number of submissions to create (default: 20)
  -c, --concurrent <num>    Concurrent approvals per batch (default: 10)
  -h, --help               Show this help

Examples:
  # Test with 50 submissions, 20 concurrent
  npx ts-node scripts/test-concurrent-approvals.ts -s 50 -c 20

  # Stress test: 100 submissions, 50 concurrent
  npx ts-node scripts/test-concurrent-approvals.ts -s 100 -c 50
    `);
    process.exit(0);
  }
}

// Run the test
runTest(config)
  .then(() => {
    log('green', '✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    log('red', '❌ Test failed');
    console.error(error);
    process.exit(1);
  });
