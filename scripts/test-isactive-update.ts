/**
 * Script to test isActive field update
 * Run with: npx ts-node scripts/test-isactive-update.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testIsActiveUpdate() {
  try {
    console.log('🔍 Testing isActive field update...\n');

    // Find first VENDOR user
    const vendor = await prisma.user.findFirst({
      where: { role: 'VENDOR' },
      select: {
        id: true,
        email: true,
        officer_name: true,
        vendor_name: true,
        role: true,
        isActive: true
      }
    });

    if (!vendor) {
      console.log('❌ No VENDOR user found in database');
      return;
    }

    console.log('📋 Found VENDOR user:');
    console.log('   ID:', vendor.id);
    console.log('   Email:', vendor.email);
    console.log('   Name:', vendor.officer_name || vendor.vendor_name);
    console.log('   Current isActive:', vendor.isActive);
    console.log('');

    // Toggle isActive
    const newActiveStatus = !vendor.isActive;
    console.log(`🔄 Updating isActive to: ${newActiveStatus}...`);

    const updated = await prisma.user.update({
      where: { id: vendor.id },
      data: { isActive: newActiveStatus },
      select: {
        id: true,
        email: true,
        isActive: true
      }
    });

    console.log('✅ Update successful!');
    console.log('   New isActive value:', updated.isActive);
    console.log('');

    // Verify the change
    const verified = await prisma.user.findUnique({
      where: { id: vendor.id },
      select: { isActive: true }
    });

    console.log('🔍 Verification from database:');
    console.log('   isActive value:', verified?.isActive);
    console.log('');

    if (verified?.isActive === newActiveStatus) {
      console.log('✅ SUCCESS: Database correctly updated!');
    } else {
      console.log('❌ FAILURE: Database value does not match!');
    }

    // Restore original value
    console.log('');
    console.log(`🔄 Restoring original value (${vendor.isActive})...`);
    await prisma.user.update({
      where: { id: vendor.id },
      data: { isActive: vendor.isActive }
    });
    console.log('✅ Restored!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIsActiveUpdate();
