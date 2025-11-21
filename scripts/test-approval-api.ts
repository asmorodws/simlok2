/**
 * Test Concurrent Approval API
 * 
 * Script ini menguji API approval secara concurrent untuk memastikan:
 * 1. Retry mechanism bekerja dengan baik
 * 2. Tidak ada duplicate SIMLOK numbers
 * 3. SIMLOK numbers tetap sequential
 * 4. API menangani race condition dengan graceful
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestConfig {
  submissionCount: number;
  concurrency: number;
  baseUrl: string;
}

interface ApprovalResult {
  submissionId: string;
  simlokNumber: string | null;
  success: boolean;
  error?: string;
  attemptNumber?: number;
  duration: number;
}

// Fungsi untuk membuat test submissions
async function createTestSubmissions(count: number): Promise<string[]> {
  console.log(`📝 Creating ${count} test submissions...`);
  
  // Cari user VENDOR dan APPROVER
  const vendor = await prisma.user.findFirst({
    where: { role: 'VENDOR' },
  });
  
  const approver = await prisma.user.findFirst({
    where: { role: 'APPROVER' },
  });

  if (!vendor || !approver) {
    throw new Error('Vendor atau Approver tidak ditemukan. Jalankan seed terlebih dahulu.');
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
        reviewed_by: approver.id,
        reviewed_at: new Date(),
        note_for_approver: 'Auto-approved for testing',
        approval_status: 'PENDING_APPROVAL',
      },
    });
    
    submissionIds.push(submission.id);
  }
  
  console.log(`✅ Created ${submissionIds.length} test submissions\n`);
  return submissionIds;
}

// Fungsi untuk login dan mendapatkan token
async function getAuthToken(baseUrl: string): Promise<string> {
  console.log('🔐 Logging in to get auth token...');
  
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'default-approver@example.com',
      password: 'user123',
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ Login successful\n');
  return data.token;
}

// Fungsi untuk approve submission via API
async function approveSubmission(
  submissionId: string,
  token: string,
  baseUrl: string
): Promise<ApprovalResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${baseUrl}/api/submissions/${submissionId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        approval_status: 'APPROVED',
      }),
    });

    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        submissionId,
        simlokNumber: null,
        success: false,
        error: errorData.error || response.statusText,
        duration,
      };
    }

    const data = await response.json();
    return {
      submissionId,
      simlokNumber: data.submission?.simlok_number || null,
      success: true,
      duration,
    };
  } catch (error: any) {
    return {
      submissionId,
      simlokNumber: null,
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

// Fungsi untuk menjalankan concurrent approvals
async function runConcurrentApprovals(
  submissionIds: string[],
  token: string,
  config: TestConfig
): Promise<ApprovalResult[]> {
  console.log(`🚀 Starting ${submissionIds.length} concurrent approvals (batch size: ${config.concurrency})...\n`);
  
  const results: ApprovalResult[] = [];
  
  // Bagi submissions ke dalam batches
  for (let i = 0; i < submissionIds.length; i += config.concurrency) {
    const batch = submissionIds.slice(i, i + config.concurrency);
    console.log(`📦 Processing batch ${Math.floor(i / config.concurrency) + 1} (${batch.length} submissions)...`);
    
    const batchPromises = batch.map(id => approveSubmission(id, token, config.baseUrl));
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults);
    
    // Log hasil batch
    batchResults.forEach((result, idx) => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${batch[idx]}: ${result.simlokNumber || result.error} (${result.duration}ms)`);
    });
    
    console.log('');
  }
  
  return results;
}

// Fungsi untuk menganalisis hasil
async function analyzeResults(results: ApprovalResult[]): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS ANALYSIS');
  console.log('='.repeat(80) + '\n');

  // 1. Success rate
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

  // 2. Check for duplicates
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

  // 3. Check sequence
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

  // 4. Performance metrics
  const durations = results.map(r => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  
  console.log('\n⏱️  Performance:');
  console.log(`  Average: ${avgDuration.toFixed(0)}ms`);
  console.log(`  Min: ${minDuration}ms`);
  console.log(`  Max: ${maxDuration}ms`);

  // 5. Verify dengan database
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
  
  // Check consistency
  const inconsistent = results.filter(r => {
    if (!r.success) return false;
    const dbRecord = dbSubmissions.find(s => s.id === r.submissionId);
    return !dbRecord || dbRecord.simlok_number !== r.simlokNumber;
  });
  
  if (inconsistent.length > 0) {
    console.log(`  ❌ INCONSISTENT: ${inconsistent.length} records don't match`);
  } else {
    console.log('  ✅ CONSISTENT - API responses match database');
  }

  // 6. Final verdict
  console.log('\n' + '='.repeat(80));
  if (failCount === 0 && !hasDuplicates && isSequential && inconsistent.length === 0) {
    console.log('✅✅✅ TEST PASSED - All checks successful!');
  } else {
    console.log('❌❌❌ TEST FAILED - Issues detected!');
  }
  console.log('='.repeat(80) + '\n');
}

// Fungsi untuk cleanup
async function cleanup(submissionIds: string[]): Promise<void> {
  console.log('🧹 Cleaning up test data...');
  
  // Delete workers first (foreign key)
  await prisma.workerList.deleteMany({
    where: {
      submission_id: { in: submissionIds },
    },
  });
  
  // Delete submissions
  await prisma.submission.deleteMany({
    where: {
      id: { in: submissionIds },
    },
  });
  
  console.log('✅ Cleanup complete\n');
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  const config: TestConfig = {
    submissionCount: 10,
    concurrency: 5,
    baseUrl: 'http://localhost:3000',
  };
  
  // Parse arguments
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
      case '-u':
      case '--url':
        config.baseUrl = args[i + 1] || 'http://localhost:3000';
        i++;
        break;
      case '-h':
      case '--help':
        console.log(`
Usage: npx tsx scripts/test-approval-api.ts [options]

Options:
  -s, --submissions <n>    Number of submissions to create (default: 10)
  -c, --concurrency <n>    Number of concurrent approvals (default: 5)
  -u, --url <url>          Base URL of the API (default: http://localhost:3000)
  -h, --help               Show this help message

Examples:
  npx tsx scripts/test-approval-api.ts
  npx tsx scripts/test-approval-api.ts -s 20 -c 10
  npx tsx scripts/test-approval-api.ts -u http://localhost:3001
        `);
        process.exit(0);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🧪 CONCURRENT APPROVAL API TEST');
  console.log('='.repeat(80));
  console.log(`Configuration:`);
  console.log(`  - Submissions: ${config.submissionCount}`);
  console.log(`  - Concurrency: ${config.concurrency}`);
  console.log(`  - Base URL: ${config.baseUrl}`);
  console.log('='.repeat(80) + '\n');

  let submissionIds: string[] = [];
  
  try {
    // 1. Create test submissions
    submissionIds = await createTestSubmissions(config.submissionCount);
    
    // 2. Get auth token
    const token = await getAuthToken(config.baseUrl);
    
    // 3. Run concurrent approvals
    const results = await runConcurrentApprovals(submissionIds, token, config);
    
    // 4. Analyze results
    await analyzeResults(results);
    
  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // 5. Cleanup
    if (submissionIds.length > 0) {
      await cleanup(submissionIds);
    }
    
    await prisma.$disconnect();
  }
}

main();
