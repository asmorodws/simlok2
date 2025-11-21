/**
 * Test Concurrent SIMLOK Generation
 * 
 * Script ini test langsung ke database untuk concurrent SIMLOK generation.
 * Mensimulasikan multiple concurrent approvals dan menganalisis hasilnya.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SimlokGenerationResult {
  submissionId: string;
  simlokNumber: string | null;
  success: boolean;
  error?: string;
  duration: number;
  attempt: number;
}

// Generate SIMLOK number dengan retry mechanism
async function generateSimlokWithRetry(submissionId: string): Promise<SimlokGenerationResult> {
  const startTime = Date.now();
  const MAX_RETRIES = 3;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${MAX_RETRIES} for submission ${submissionId}`);
      
      const result = await prisma.$transaction(async (tx) => {
        // Add random jitter to increase chance of conflict
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        // Get next number with FOR UPDATE lock
        const maxResult = await tx.$queryRaw<Array<{ max_number: bigint | null }>>`
          SELECT CAST(SUBSTRING_INDEX(simlok_number, '/', 1) AS UNSIGNED) as max_number
          FROM Submission
          WHERE simlok_number IS NOT NULL
          ORDER BY max_number DESC
          LIMIT 1
          FOR UPDATE
        `;
        
        const currentMax = maxResult[0]?.max_number ? Number(maxResult[0].max_number) : 0;
        const nextNumber = currentMax + 1;
        const year = new Date().getFullYear();
        const simlokNumber = `${nextNumber}/S00330/${year}-S0`;
        
        console.log(`  📝 Generating number ${simlokNumber} for ${submissionId}`);
        
        // Update submission
        const updated = await tx.submission.update({
          where: { id: submissionId },
          data: {
            simlok_number: simlokNumber,
            simlok_date: new Date(),
            approval_status: 'APPROVED',
            approved_at: new Date(),
          },
        });
        
        return updated.simlok_number;
      }, {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: 'Serializable',
      });
      
      const duration = Date.now() - startTime;
      console.log(`  ✅ Success: ${result} (${duration}ms)`);
      
      return {
        submissionId,
        simlokNumber: result,
        success: true,
        duration,
        attempt,
      };
      
    } catch (error: any) {
      const isSimlokConflict =
        error?.code === 'P2002' ||
        error?.message?.includes('Unique constraint') ||
        error?.message?.includes('simlok_number');
      
      if (isSimlokConflict && attempt < MAX_RETRIES) {
        const waitMs = Math.pow(2, attempt) * 100;
        console.log(`  ⏳ Conflict detected, waiting ${waitMs}ms before retry...`);
        await new Promise(res => setTimeout(res, waitMs));
        continue;
      }
      
      const duration = Date.now() - startTime;
      console.log(`  ❌ Failed: ${error.message}`);
      
      return {
        submissionId,
        simlokNumber: null,
        success: false,
        error: error.message,
        duration,
        attempt,
      };
    }
  }
  
  // Should never reach here
  return {
    submissionId,
    simlokNumber: null,
    success: false,
    error: 'Max retries exceeded',
    duration: Date.now() - startTime,
    attempt: MAX_RETRIES,
  };
}

// Create test submissions
async function createTestSubmissions(count: number): Promise<string[]> {
  console.log(`📝 Creating ${count} test submissions...\n`);
  
  const vendor = await prisma.user.findFirst({
    where: { role: 'VENDOR' },
  });
  
  if (!vendor) {
    throw new Error('Vendor tidak ditemukan. Jalankan seed terlebih dahulu.');
  }
  
  const submissionIds: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const submission = await prisma.submission.create({
      data: {
        user_id: vendor.id,
        vendor_name: `Test Vendor ${i + 1}`,
        vendor_phone: '081234567890',
        based_on: 'Surat Perintah Kerja',
        officer_name: `Officer ${i + 1}`,
        job_description: 'Testing Job',
        work_location: 'Testing Location',
        working_hours: '08:00-17:00',
        work_facilities: 'Testing Facilities',
        worker_names: `Worker ${i + 1}`,
        implementation_start_date: new Date(),
        implementation_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        worker_list: {
          create: [
            {
              worker_name: `Worker ${i + 1}`,
            },
          ],
        },
        review_status: 'MEETS_REQUIREMENTS',
        reviewed_at: new Date(),
        approval_status: 'PENDING_APPROVAL',
      },
    });
    
    submissionIds.push(submission.id);
  }
  
  console.log(`✅ Created ${submissionIds.length} test submissions\n`);
  return submissionIds;
}

// Run concurrent approvals
async function runConcurrentApprovals(
  submissionIds: string[],
  concurrency: number
): Promise<SimlokGenerationResult[]> {
  console.log(`🚀 Starting ${submissionIds.length} concurrent SIMLOK generations (batch size: ${concurrency})...\n`);
  
  const results: SimlokGenerationResult[] = [];
  
  for (let i = 0; i < submissionIds.length; i += concurrency) {
    const batch = submissionIds.slice(i, i + concurrency);
    console.log(`📦 Processing batch ${Math.floor(i / concurrency) + 1} (${batch.length} submissions)...\n`);
    
    const batchPromises = batch.map(id => generateSimlokWithRetry(id));
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults);
    console.log('');
  }
  
  return results;
}

// Analyze results
async function analyzeResults(results: SimlokGenerationResult[]): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS ANALYSIS');
  console.log('='.repeat(80) + '\n');
  
  // Success rate
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`✅ Success: ${successCount}/${results.length}`);
  console.log(`❌ Failed: ${failCount}/${results.length}`);
  
  if (failCount > 0) {
    console.log('\n❌ Failed approvals:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.submissionId}: ${r.error}`);
    });
  }
  
  // Check duplicates
  const simlokNumbers = results
    .filter(r => r.success && r.simlokNumber)
    .map(r => r.simlokNumber!);
  
  const uniqueNumbers = new Set(simlokNumbers);
  const hasDuplicates = simlokNumbers.length !== uniqueNumbers.size;
  
  console.log('\n📋 SIMLOK Numbers:');
  console.log(`  Total: ${simlokNumbers.length}`);
  console.log(`  Unique: ${uniqueNumbers.size}`);
  
  if (hasDuplicates) {
    console.log('  ❌ DUPLICATES FOUND!');
    const duplicates = simlokNumbers.filter((num, idx) => simlokNumbers.indexOf(num) !== idx);
    console.log(`  Duplicate numbers: ${[...new Set(duplicates)].join(', ')}`);
  } else {
    console.log('  ✅ NO DUPLICATES - All numbers are unique!');
  }
  
  // Check sequence
  const numbers = simlokNumbers
    .filter((s): s is string => Boolean(s))
    .map(s => {
      const parts = s.split('/');
      return parseInt(parts[0] || '0');
    })
    .sort((a, b) => a - b);
  
  let isSequential = false;
  
  if (numbers.length > 0) {
    const min = numbers[0]!;
    const max = numbers[numbers.length - 1]!;
    const expectedCount = max - min + 1;
    isSequential = expectedCount === numbers.length;
    
    console.log('\n🔢 Sequence Analysis:');
    console.log(`  Range: ${min} to ${max}`);
    console.log(`  Expected count: ${expectedCount}`);
    console.log(`  Actual count: ${numbers.length}`);
    
    if (isSequential) {
      console.log('  ✅ SEQUENTIAL - Perfect sequence!');
    } else {
      console.log('  ❌ GAPS DETECTED - Sequence has missing numbers');
      const missing: number[] = [];
      for (let i = min; i <= max; i++) {
        if (!numbers.includes(i)) missing.push(i);
      }
      console.log(`  Missing: ${missing.join(', ')}`);
    }
  }
  
  // Retry statistics
  const retriedCount = results.filter(r => r.attempt > 1).length;
  console.log('\n🔄 Retry Statistics:');
  console.log(`  Required retry: ${retriedCount}/${results.length}`);
  
  if (retriedCount > 0) {
    const retryDetails = results.filter(r => r.attempt > 1);
    console.log(`  Max attempts: ${Math.max(...retryDetails.map(r => r.attempt))}`);
    console.log(`  Avg attempts: ${(retryDetails.reduce((sum, r) => sum + r.attempt, 0) / retriedCount).toFixed(2)}`);
  }
  
  // Performance
  const durations = results.map(r => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  
  console.log('\n⏱️  Performance:');
  console.log(`  Average: ${avgDuration.toFixed(0)}ms`);
  console.log(`  Min: ${minDuration}ms`);
  console.log(`  Max: ${maxDuration}ms`);
  
  // Database verification
  console.log('\n🔍 Database Verification:');
  const dbSubmissions = await prisma.submission.findMany({
    where: {
      id: { in: results.map(r => r.submissionId) },
      simlok_number: { not: null },
    },
    select: {
      id: true,
      simlok_number: true,
    },
  });
  
  console.log(`  Approved in DB: ${dbSubmissions.length}/${results.length}`);
  
  const inconsistent = results.filter(r => {
    if (!r.success) return false;
    const dbRecord = dbSubmissions.find(s => s.id === r.submissionId);
    return !dbRecord || dbRecord.simlok_number !== r.simlokNumber;
  });
  
  if (inconsistent.length > 0) {
    console.log(`  ❌ INCONSISTENT: ${inconsistent.length} records don't match`);
  } else {
    console.log('  ✅ CONSISTENT - Results match database');
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (failCount === 0 && !hasDuplicates && isSequential && inconsistent.length === 0) {
    console.log('✅✅✅ TEST PASSED - All checks successful!');
  } else {
    console.log('❌❌❌ TEST FAILED - Issues detected!');
  }
  console.log('='.repeat(80) + '\n');
}

// Cleanup
async function cleanup(submissionIds: string[]): Promise<void> {
  console.log('🧹 Cleaning up test data...');
  
  await prisma.workerList.deleteMany({
    where: {
      submission_id: { in: submissionIds },
    },
  });
  
  await prisma.submission.deleteMany({
    where: {
      id: { in: submissionIds },
    },
  });
  
  console.log('✅ Cleanup complete\n');
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  const config = {
    submissionCount: 10,
    concurrency: 5,
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-s':
      case '--submissions':
        config.submissionCount = parseInt(args[i + 1] || '10') || 10;
        i++;
        break;
      case '-c':
      case '--concurrency':
        config.concurrency = parseInt(args[i + 1] || '5') || 5;
        i++;
        break;
      case '-h':
      case '--help':
        console.log(`
Usage: npx tsx scripts/test-concurrent-simlok.ts [options]

Options:
  -s, --submissions <n>    Number of submissions to create (default: 10)
  -c, --concurrency <n>    Number of concurrent approvals (default: 5)
  -h, --help               Show this help message

Examples:
  npx tsx scripts/test-concurrent-simlok.ts
  npx tsx scripts/test-concurrent-simlok.ts -s 20 -c 10
        `);
        process.exit(0);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🧪 CONCURRENT SIMLOK GENERATION TEST');
  console.log('='.repeat(80));
  console.log(`Configuration:`);
  console.log(`  - Submissions: ${config.submissionCount}`);
  console.log(`  - Concurrency: ${config.concurrency}`);
  console.log('='.repeat(80) + '\n');
  
  let submissionIds: string[] = [];
  
  try {
    submissionIds = await createTestSubmissions(config.submissionCount);
    const results = await runConcurrentApprovals(submissionIds, config.concurrency);
    await analyzeResults(results);
  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (submissionIds.length > 0) {
      await cleanup(submissionIds);
    }
    await prisma.$disconnect();
  }
}

main();
