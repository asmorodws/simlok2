import { prisma } from '../src/lib/singletons';

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate SIMLOK numbers...\n');

  const duplicates = await prisma.$queryRaw<Array<{ simlok_number: string; count: bigint }>>`
    SELECT simlok_number, COUNT(*) as count 
    FROM Submission 
    WHERE simlok_number IS NOT NULL 
    GROUP BY simlok_number 
    HAVING count > 1
  `;

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found! Safe to add unique constraint.\n');
  } else {
    console.log('❌ Found duplicates:\n');
    for (const dup of duplicates) {
      console.log(`   SIMLOK: ${dup.simlok_number} - Count: ${dup.count}`);
    }
    console.log('\n⚠️  Fix duplicates before adding unique constraint!');
    console.log('   Run: npx tsx scripts/fix-simlok-issues.ts --fix\n');
  }

  await prisma.$disconnect();
}

checkDuplicates().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
