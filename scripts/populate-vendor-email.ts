import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateVendorEmail() {
  try {
    console.log('🔄 Starting vendor email population...');

    // Get all submissions that have user relation but no vendor_email
    const submissions = await prisma.submission.findMany({
      where: {
        user_email: null,
        user_id: {
          not: null
        }
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    console.log(`📊 Found ${submissions.length} submissions to update`);

    let updated = 0;
    for (const submission of submissions) {
      if (submission.user?.email) {
        await prisma.submission.update({
          where: { id: submission.id },
          data: {
            user_email: submission.user.email
          }
        });
        updated++;
      }
    }

    console.log(`✅ Successfully updated ${updated} submissions with vendor email`);
  } catch (error) {
    console.error('❌ Error populating vendor email:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateVendorEmail();