/**
 * Migration script to normalize all phone numbers in database
 * Converts all phone numbers to 62 format (without +)
 * 
 * Run with: npx tsx scripts/migrate-phone-numbers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Normalize phone number to 62 format (without +)
 */
function normalizePhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Remove leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Remove 62 prefix if present
  if (cleaned.startsWith('62')) {
    cleaned = cleaned.substring(2);
  }
  
  // If empty after cleaning, return empty
  if (!cleaned) return '';
  
  // Return with 62 prefix (without +)
  return `62${cleaned}`;
}

async function migratePhoneNumbers() {
  console.log('🔄 Starting phone number migration...\n');
  
  try {
    // Fetch all users with phone numbers
    const users = await prisma.user.findMany({
      where: {
        phone_number: { not: null }
      },
      select: {
        id: true,
        email: true,
        phone_number: true,
        vendor_name: true,
        officer_name: true,
      }
    });

    console.log(`📊 Found ${users.length} users with phone numbers\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      const oldPhone = user.phone_number;
      
      if (!oldPhone) {
        skipped++;
        continue;
      }

      // Check if already in 62 format
      if (oldPhone.startsWith('62') && !oldPhone.startsWith('+') && oldPhone.length >= 11) {
        console.log(`⏭️  SKIP: ${user.email} - Already normalized: ${oldPhone}`);
        skipped++;
        continue;
      }

      // Normalize the phone number
      const normalizedPhone = normalizePhoneNumber(oldPhone);

      if (!normalizedPhone) {
        console.log(`⚠️  ERROR: ${user.email} - Could not normalize: ${oldPhone}`);
        errors++;
        continue;
      }

      try {
        // Update in database
        await prisma.user.update({
          where: { id: user.id },
          data: { phone_number: normalizedPhone }
        });

        const displayName = user.vendor_name || user.officer_name || user.email;
        console.log(`✅ UPDATE: ${displayName}`);
        console.log(`   ${oldPhone} → ${normalizedPhone}\n`);
        updated++;
      } catch (error) {
        console.log(`❌ FAILED: ${user.email} - ${oldPhone}`);
        console.error(`   Error: ${error}\n`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users processed: ${users.length}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Skipped (already normalized): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    if (updated > 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else if (skipped === users.length) {
      console.log('\n✨ All phone numbers were already normalized!');
    } else {
      console.log('\n⚠️  Migration completed with some errors.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migratePhoneNumbers()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
