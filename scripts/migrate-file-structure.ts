/**
 * Migration Script: Update File Structure
 * 
 * This script migrates files from old structure to new structure:
 * - Moves files from 'id-card/' and 'lainnya/' to appropriate new folders
 * - Updates database URLs to reflect new paths
 * - Creates new folder structure if not exists
 * 
 * Run with: npx tsx scripts/migrate-file-structure.ts
 */

import { PrismaClient } from '@prisma/client';
import { readdir, rename, mkdir, stat, rmdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const prisma = new PrismaClient();

// Mapping folder lama ke folder baru
const OLD_TO_NEW_FOLDER: Record<string, string> = {
  'lainnya': 'dokumen-hsse-pekerja',
  'id-card': 'dokumen',
};

interface MigrationResult {
  totalUsers: number;
  totalFiles: number;
  movedFiles: number;
  updatedUrls: number;
  errors: string[];
}

async function ensureNewFolders(userId: string, baseDir: string): Promise<void> {
  const newFolders = [
    'dokumen-sika',
    'dokumen-simja',
    'dokumen-hsse',
    'dokumen-hsse-pekerja',
    'dokumen',
    'foto-pekerja'
  ];

  for (const folder of newFolders) {
    const folderPath = join(baseDir, userId, folder);
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true });
      console.log(`  ✅ Created folder: ${folder}`);
    }
  }
}

async function migrateUserFiles(userId: string, baseDir: string, result: MigrationResult): Promise<void> {
  console.log(`\n📁 Processing user: ${userId}`);
  
  const userDir = join(baseDir, userId);
  
  // Ensure new folder structure exists
  await ensureNewFolders(userId, baseDir);

  // Process old folders
  for (const [oldFolder, newFolder] of Object.entries(OLD_TO_NEW_FOLDER)) {
    const oldPath = join(userDir, oldFolder);
    
    if (!existsSync(oldPath)) {
      console.log(`  ℹ️  Folder not found: ${oldFolder} - skipping`);
      continue;
    }

    try {
      const files = await readdir(oldPath);
      console.log(`  📂 Found ${files.length} files in ${oldFolder}/`);

      for (const filename of files) {
        const oldFilePath = join(oldPath, filename);
        const newFilePath = join(userDir, newFolder, filename);

        try {
          // Check if it's a file (not directory)
          const stats = await stat(oldFilePath);
          if (!stats.isFile()) {
            console.log(`  ⏭️  Skipping directory: ${filename}`);
            continue;
          }

          // Move file
          await rename(oldFilePath, newFilePath);
          console.log(`  ✅ Moved: ${oldFolder}/${filename} → ${newFolder}/${filename}`);
          result.movedFiles++;
          result.totalFiles++;
        } catch (error) {
          const errorMsg = `Error moving file ${filename}: ${error}`;
          console.error(`  ❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      // Remove old empty folder
      try {
        const remainingFiles = await readdir(oldPath);
        if (remainingFiles.length === 0) {
          await rmdir(oldPath);
          console.log(`  🗑️  Removed empty folder: ${oldFolder}/`);
        } else {
          console.log(`  ⚠️  Folder ${oldFolder}/ not empty, not removed`);
        }
      } catch (error) {
        console.error(`  ⚠️  Could not remove folder ${oldFolder}/: ${error}`);
      }
    } catch (error) {
      const errorMsg = `Error processing folder ${oldFolder}: ${error}`;
      console.error(`  ❌ ${errorMsg}`);
      result.errors.push(errorMsg);
    }
  }
}

async function updateDatabaseUrls(result: MigrationResult): Promise<void> {
  console.log('\n🔄 Updating database URLs...');

  try {
    // Update WorkerList table - change /other/ to /hsse-worker/
    const workerListUpdate = await prisma.$executeRaw`
      UPDATE WorkerList
      SET hsse_pass_document_upload = REPLACE(hsse_pass_document_upload, '/other/', '/hsse-worker/')
      WHERE hsse_pass_document_upload LIKE '%/other/%'
    `;
    console.log(`  ✅ Updated ${workerListUpdate} WorkerList URLs (other → hsse-worker)`);
    result.updatedUrls += workerListUpdate;

    // Update any id-card references (if exists in Submission or other tables)
    // Note: Adjust this based on actual database schema
    const submissionUpdate = await prisma.$executeRaw`
      UPDATE Submission
      SET 
        sika_document_upload = REPLACE(sika_document_upload, '/id-card/', '/document/'),
        simja_document_upload = REPLACE(simja_document_upload, '/id-card/', '/document/')
      WHERE 
        sika_document_upload LIKE '%/id-card/%' OR
        simja_document_upload LIKE '%/id-card/%'
    `;
    console.log(`  ✅ Updated ${submissionUpdate} Submission URLs (id-card → document)`);
    result.updatedUrls += submissionUpdate;

  } catch (error) {
    const errorMsg = `Error updating database: ${error}`;
    console.error(`  ❌ ${errorMsg}`);
    result.errors.push(errorMsg);
  }
}

async function main() {
  console.log('🚀 Starting File Structure Migration\n');
  console.log('This script will:');
  console.log('  1. Move files from old folders (id-card, lainnya) to new folders');
  console.log('  2. Update database URLs to reflect new structure');
  console.log('  3. Remove empty old folders\n');

  const result: MigrationResult = {
    totalUsers: 0,
    totalFiles: 0,
    movedFiles: 0,
    updatedUrls: 0,
    errors: []
  };

  const baseUploadDir = join(process.cwd(), 'public', 'uploads');

  try {
    // Get all user directories
    const userDirs = await readdir(baseUploadDir);
    result.totalUsers = userDirs.length;

    console.log(`📊 Found ${userDirs.length} user directories\n`);

    // Process each user
    for (const userId of userDirs) {
      const userPath = join(baseUploadDir, userId);
      const stats = await stat(userPath);
      
      if (stats.isDirectory()) {
        await migrateUserFiles(userId, baseUploadDir, result);
      }
    }

    // Update database URLs
    await updateDatabaseUrls(result);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Users Processed: ${result.totalUsers}`);
    console.log(`Total Files Found: ${result.totalFiles}`);
    console.log(`Files Moved: ${result.movedFiles}`);
    console.log(`Database URLs Updated: ${result.updatedUrls}`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach((error, idx) => {
        console.log(`  ${idx + 1}. ${error}`);
      });
    }

    if (result.errors.length === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review above.');
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
main()
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
