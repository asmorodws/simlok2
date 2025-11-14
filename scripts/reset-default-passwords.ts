#!/usr/bin/env node
/**
 * Reset Default User Passwords
 * 
 * This script resets passwords for default users to known values for testing.
 * 
 * Usage:
 *   npx tsx scripts/reset-default-passwords.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// New password for all default users
const NEW_PASSWORD = 'user123';

async function resetPasswords() {
  console.log('🔐 Resetting passwords for users starting with "default-"...\n');

  // Find all users whose email starts with "default-"
  const defaultUsers = await prisma.user.findMany({
    where: {
      email: {
        startsWith: 'default-',
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      officer_name: true,
    },
  });

  if (defaultUsers.length === 0) {
    console.log('⚠️  No users found with email starting with "default-"');
    return;
  }

  console.log(`Found ${defaultUsers.length} default users:\n`);

  // Hash the new password once
  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

  for (const user of defaultUsers) {
    try {
      // Update user password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      console.log(`✅ ${user.role.padEnd(12)} - ${user.email}`);
      console.log(`   Officer: ${user.officer_name || 'N/A'}`);
      console.log(`   Password: ${NEW_PASSWORD}`);
      console.log('');

    } catch (error) {
      console.error(`❌ Error updating ${user.email}:`, error);
    }
  }

  console.log('━'.repeat(80));
  console.log('✅ Password reset complete!\n');
  console.log('📋 All default users now have password: user123\n');
  
  console.log('Summary:');
  defaultUsers.forEach(user => {
    console.log(`${user.role.padEnd(12)} | ${user.email.padEnd(40)} | user123`);
  });
  
  console.log('\n' + '━'.repeat(80));
}

// Run the script
resetPasswords()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
