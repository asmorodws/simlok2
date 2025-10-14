// Script to migrate existing submission data to include denormalized user information
// This ensures submissions retain user data even if the user is deleted

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateSubmissionUserData() {
  console.log('🔄 Starting migration of submission user data...');

  try {
    // Get all submissions that have user_id but missing denormalized user data
    const submissions = await prisma.submission.findMany({
      where: {
        user_id: { not: null },
        OR: [
          { user_email: null },
          { user_officer_name: null }
        ]
      },
      include: {
        user: {
          select: {
            email: true,
            officer_name: true,
            vendor_name: true,
            phone_number: true,
            address: true
          }
        }
      }
    });

    console.log(`📋 Found ${submissions.length} submissions to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const submission of submissions) {
      if (!submission.user) {
        console.log(`⚠️  Skipping submission ${submission.id} - user not found`);
        skippedCount++;
        continue;
      }

      // Update submission with denormalized user data
      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          user_email: submission.user.email,
          user_officer_name: submission.user.officer_name,
          user_vendor_name: submission.user.vendor_name,
          user_phone_number: submission.user.phone_number,
          user_address: submission.user.address
        }
      });

      migratedCount++;

      if (migratedCount % 100 === 0) {
        console.log(`📦 Migrated ${migratedCount} submissions...`);
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log(`📊 Statistics:`);
    console.log(`   - Total processed: ${submissions.length}`);
    console.log(`   - Successfully migrated: ${migratedCount}`);
    console.log(`   - Skipped (no user): ${skippedCount}`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  migrateSubmissionUserData()
    .then(() => {
      console.log('🎉 Migration script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateSubmissionUserData };