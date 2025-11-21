/**
 * Auto-Fix SIMLOK Issues
 * 
 * Script ini akan:
 * 1. Mendeteksi duplicate SIMLOK numbers
 * 2. Mendeteksi gaps dalam sequence
 * 3. Secara otomatis memperbaiki masalah yang ditemukan
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SimlokIssue {
  type: 'DUPLICATE' | 'GAP';
  numbers: number[];
  submissions: Array<{
    id: string;
    simlok_number: string;
    created_at: Date;
  }>;
}

// Fungsi untuk mendeteksi duplicate SIMLOK numbers
async function detectDuplicates(): Promise<SimlokIssue[]> {
  console.log('🔍 Checking for duplicate SIMLOK numbers...\n');
  
  const duplicates = await prisma.$queryRaw<
    Array<{
      simlok_number: string;
      count: bigint;
    }>
  >`
    SELECT simlok_number, COUNT(*) as count
    FROM Submission
    WHERE simlok_number IS NOT NULL
    GROUP BY simlok_number
    HAVING COUNT(*) > 1
  `;

  const issues: SimlokIssue[] = [];
  
  for (const dup of duplicates) {
    const submissions = await prisma.submission.findMany({
      where: { simlok_number: dup.simlok_number },
      select: {
        id: true,
        simlok_number: true,
        created_at: true,
      },
      orderBy: { created_at: 'asc' },
    });

    const parts = dup.simlok_number.split('/');
    const number = parseInt(parts[0] || '0');
    
    console.log(`❌ Duplicate found: ${dup.simlok_number}`);
    console.log(`   Count: ${Number(dup.count)}`);
    console.log(`   Submissions:`);
    submissions.forEach((s, idx) => {
      console.log(`     ${idx + 1}. ${s.id} (created: ${s.created_at.toISOString()})`);
    });
    console.log('');

    issues.push({
      type: 'DUPLICATE',
      numbers: [number],
      submissions: submissions.filter((s): s is typeof s & { simlok_number: string } => s.simlok_number !== null),
    });
  }
  
  if (issues.length === 0) {
    console.log('✅ No duplicates found!\n');
  }
  
  return issues;
}

// Fungsi untuk mendeteksi gaps dalam sequence
async function detectGaps(): Promise<SimlokIssue> {
  console.log('🔍 Checking for gaps in SIMLOK sequence...\n');
  
  const allNumbers = await prisma.$queryRaw<
    Array<{ number: bigint }>
  >`
    SELECT CAST(SUBSTRING_INDEX(simlok_number, '/', 1) AS UNSIGNED) as number
    FROM Submission
    WHERE simlok_number IS NOT NULL
    ORDER BY number ASC
  `;

  const numbers = allNumbers.map(n => Number(n.number));
  
  if (numbers.length === 0) {
    console.log('ℹ️  No SIMLOK numbers found\n');
    return { type: 'GAP', numbers: [], submissions: [] };
  }

  const min = numbers[0];
  const max = numbers[numbers.length - 1];
  const gaps: number[] = [];
  
  if (min !== undefined && max !== undefined) {
    for (let i = min; i <= max; i++) {
      if (!numbers.includes(i)) {
        gaps.push(i);
      }
    }
  }
  
  if (gaps.length > 0) {
    console.log(`❌ Gaps detected in sequence (${min} to ${max}):`);
    console.log(`   Missing numbers: ${gaps.join(', ')}\n`);
  } else {
    console.log(`✅ No gaps found! Perfect sequence from ${min} to ${max}\n`);
  }
  
  return {
    type: 'GAP',
    numbers: gaps,
    submissions: [],
  };
}

// Fungsi untuk fix duplicates
async function fixDuplicates(duplicateIssues: SimlokIssue[]): Promise<void> {
  if (duplicateIssues.length === 0) {
    console.log('ℹ️  No duplicates to fix\n');
    return;
  }

  console.log('🔧 Starting duplicate fix...\n');
  
  for (const issue of duplicateIssues) {
    const { submissions } = issue;
    
    if (submissions.length === 0) continue;
    
    // Keep the first (oldest) submission with its number
    // Reassign new numbers to the rest
    const toFix = submissions.slice(1);
    const firstSubmission = submissions[0];
    
    if (!firstSubmission) continue;
    
    console.log(`Fixing ${toFix.length} duplicate(s) of ${firstSubmission.simlok_number}:`);
    console.log(`  Keeping: ${firstSubmission.id} (oldest)`);
    
    for (const submission of toFix) {
      try {
        // Get next available number
        const result = await prisma.$queryRaw<Array<{ max_number: bigint | null }>>`
          SELECT CAST(SUBSTRING_INDEX(simlok_number, '/', 1) AS UNSIGNED) as max_number
          FROM Submission
          WHERE simlok_number IS NOT NULL
          ORDER BY max_number DESC
          LIMIT 1
        `;
        
        const currentMax = result[0]?.max_number ? Number(result[0].max_number) : 0;
        const nextNumber = currentMax + 1;
        const year = new Date().getFullYear();
        const newSimlokNumber = `${nextNumber}/S00330/${year}-S0`;
        
        await prisma.submission.update({
          where: { id: submission.id },
          data: { simlok_number: newSimlokNumber },
        });
        
        console.log(`  ✅ ${submission.id}: ${submission.simlok_number} → ${newSimlokNumber}`);
      } catch (error: any) {
        console.log(`  ❌ ${submission.id}: Failed to fix - ${error.message}`);
      }
    }
    
    console.log('');
  }
  
  console.log('✅ Duplicate fix completed!\n');
}

// Fungsi untuk fix gaps (optional - biasanya gaps tidak perlu di-fix)
async function analyzeGaps(gapIssue: SimlokIssue): Promise<void> {
  if (gapIssue.numbers.length === 0) {
    return;
  }

  console.log('ℹ️  Gap Analysis:');
  console.log('   Gaps in sequences are usually not critical unless they affect business logic.');
  console.log('   Gaps can occur due to:');
  console.log('   - Deleted submissions');
  console.log('   - Failed transactions');
  console.log('   - Manual fixes\n');
  console.log('   If you need continuous sequence, consider reassigning all numbers.');
  console.log('   WARNING: This will change all SIMLOK numbers!\n');
}

// Fungsi untuk generate report
async function generateReport(): Promise<void> {
  console.log('📊 SIMLOK Health Report\n');
  console.log('='.repeat(80) + '\n');
  
  const stats = await prisma.submission.aggregate({
    where: { simlok_number: { not: null } },
    _count: true,
  });
  
  const result = await prisma.$queryRaw<
    Array<{ 
      min_number: bigint | null;
      max_number: bigint | null;
    }>
  >`
    SELECT 
      MIN(CAST(SUBSTRING_INDEX(simlok_number, '/', 1) AS UNSIGNED)) as min_number,
      MAX(CAST(SUBSTRING_INDEX(simlok_number, '/', 1) AS UNSIGNED)) as max_number
    FROM Submission
    WHERE simlok_number IS NOT NULL
  `;
  
  const minNumber = result[0]?.min_number ? Number(result[0].min_number) : 0;
  const maxNumber = result[0]?.max_number ? Number(result[0].max_number) : 0;
  
  console.log('Statistics:');
  console.log(`  Total SIMLOK numbers: ${stats._count}`);
  console.log(`  Range: ${minNumber} to ${maxNumber}`);
  console.log(`  Expected count: ${maxNumber - minNumber + 1}`);
  
  if (stats._count === maxNumber - minNumber + 1) {
    console.log('  ✅ Perfect sequence with no gaps!');
  } else {
    console.log(`  ⚠️  ${maxNumber - minNumber + 1 - stats._count} gap(s) detected`);
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const autoFix = args.includes('--fix') || args.includes('-f');
  const reportOnly = args.includes('--report') || args.includes('-r');
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npx tsx scripts/fix-simlok-issues.ts [options]

Options:
  -f, --fix       Automatically fix detected issues
  -r, --report    Show report only (no detection)
  -h, --help      Show this help message

Examples:
  npx tsx scripts/fix-simlok-issues.ts              # Detect issues only
  npx tsx scripts/fix-simlok-issues.ts --fix        # Detect and fix issues
  npx tsx scripts/fix-simlok-issues.ts --report     # Show health report
    `);
    process.exit(0);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🔧 SIMLOK ISSUE DETECTION AND FIX');
  console.log('='.repeat(80) + '\n');

  try {
    if (reportOnly) {
      await generateReport();
    } else {
      // 1. Detect duplicates
      const duplicateIssues = await detectDuplicates();
      
      // 2. Detect gaps
      const gapIssue = await detectGaps();
      
      // 3. Auto-fix if requested
      if (autoFix) {
        if (duplicateIssues.length > 0) {
          const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          
          await new Promise<void>((resolve) => {
            readline.question(
              `⚠️  Found ${duplicateIssues.length} duplicate(s). Proceed with fix? (y/N): `,
              (answer: string) => {
                readline.close();
                if (answer.toLowerCase() === 'y') {
                  fixDuplicates(duplicateIssues).then(() => resolve());
                } else {
                  console.log('❌ Fix cancelled by user\n');
                  resolve();
                }
              }
            );
          });
        }
        
        if (gapIssue.numbers.length > 0) {
          await analyzeGaps(gapIssue);
        }
      } else {
        if (duplicateIssues.length > 0 || gapIssue.numbers.length > 0) {
          console.log('💡 Run with --fix flag to automatically fix detected issues\n');
        }
      }
      
      // 4. Show final report
      await generateReport();
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
