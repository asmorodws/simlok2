#!/usr/bin/env node
/**
 * Script to check for duplicate SIMLOK numbers in database
 * Run this BEFORE applying the unique constraint migration
 * to identify and fix any existing duplicates.
 * 
 * Usage:
 *   npx ts-node scripts/check-duplicate-simlok.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateResult {
  simlok_number: string;
  count: number;
  submissions: Array<{
    id: string;
    vendor_name: string | null;
    created_at: Date;
    approval_status: string;
  }>;
}

async function checkDuplicateSimlokNumbers() {
  console.log('🔍 Checking for duplicate SIMLOK numbers...\n');

  try {
    // Query to find duplicate SIMLOK numbers
    const duplicates = await prisma.$queryRaw<Array<{ simlok_number: string; count: bigint }>>`
      SELECT simlok_number, COUNT(*) as count
      FROM Submission
      WHERE simlok_number IS NOT NULL
      GROUP BY simlok_number
      HAVING count > 1
      ORDER BY count DESC, simlok_number ASC
    `;

    if (duplicates.length === 0) {
      console.log('✅ No duplicate SIMLOK numbers found!');
      console.log('   Database is ready for unique constraint migration.\n');
      return;
    }

    console.log(`❌ Found ${duplicates.length} duplicate SIMLOK numbers:\n`);
    console.log('┌─────────────────────────┬───────┐');
    console.log('│ SIMLOK Number           │ Count │');
    console.log('├─────────────────────────┼───────┤');

    const duplicateDetails: DuplicateResult[] = [];

    for (const dup of duplicates) {
      const count = Number(dup.count);
      console.log(`│ ${dup.simlok_number.padEnd(23)} │ ${count.toString().padStart(5)} │`);

      // Get details of all submissions with this SIMLOK number
      const submissions = await prisma.submission.findMany({
        where: { simlok_number: dup.simlok_number },
        select: {
          id: true,
          vendor_name: true,
          created_at: true,
          approval_status: true,
          simlok_date: true,
          approved_at: true,
        },
        orderBy: { created_at: 'asc' },
      });

      duplicateDetails.push({
        simlok_number: dup.simlok_number,
        count,
        submissions: submissions.map(s => ({
          id: s.id,
          vendor_name: s.vendor_name,
          created_at: s.created_at,
          approval_status: s.approval_status,
        })),
      });
    }

    console.log('└─────────────────────────┴───────┘\n');

    // Print detailed information
    console.log('📋 Detailed Information:\n');
    for (const detail of duplicateDetails) {
      console.log(`\n🔴 SIMLOK: ${detail.simlok_number} (${detail.count} duplicates)`);
      console.log('─'.repeat(80));
      
      detail.submissions.forEach((sub, index) => {
        console.log(`\n  ${index + 1}. Submission ID: ${sub.id}`);
        console.log(`     Vendor: ${sub.vendor_name || 'N/A'}`);
        console.log(`     Created: ${sub.created_at.toISOString()}`);
        console.log(`     Status: ${sub.approval_status}`);
      });
    }

    console.log('\n\n⚠️  ACTION REQUIRED:');
    console.log('   Before applying the unique constraint migration, you must fix these duplicates.');
    console.log('   Options:');
    console.log('   1. Keep the oldest submission with original SIMLOK');
    console.log('   2. Regenerate new SIMLOK numbers for duplicates');
    console.log('   3. Mark duplicates as REJECTED if they are invalid\n');

    console.log('💡 Suggested SQL to regenerate SIMLOK for duplicates:');
    console.log('   (Run in MySQL client after reviewing which submissions to update)\n');

    // Generate SQL suggestions
    for (const detail of duplicateDetails) {
      if (detail.submissions.length === 0) continue;
      
      const [keep, ...regenerate] = detail.submissions;
      if (!keep) continue;
      
      console.log(`-- Keep: ${keep.id} (${detail.simlok_number})`);
      console.log(`-- Regenerate for these submissions:`);
      
      regenerate.forEach(sub => {
        console.log(`UPDATE Submission SET simlok_number = NULL WHERE id = '${sub.id}';`);
      });
      console.log('');
    }

    console.log('\n🔄 After fixing duplicates, re-run this script to verify.\n');

  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkDuplicateSimlokNumbers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
