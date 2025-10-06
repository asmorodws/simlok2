/**
 * Script untuk memverifikasi integritas data submission dan dokumen
 * Pastikan semua dokumen tersimpan dengan benar dan data di database konsisten
 */

import { PrismaClient } from '@prisma/client';
import { join } from 'path';
import { existsSync } from 'fs';

const prisma = new PrismaClient();

interface VerificationResult {
  totalSubmissions: number;
  submissionsWithMissingFiles: number;
  submissionsWithAllFiles: number;
  missingFiles: string[];
  orphanedFiles: string[];
  workersWithMissingPhotos: number;
  workersWithPhotos: number;
}

async function verifyDataIntegrity(): Promise<VerificationResult> {
  console.log('🔍 Memulai verifikasi integritas data...\n');

  const result: VerificationResult = {
    totalSubmissions: 0,
    submissionsWithMissingFiles: 0,
    submissionsWithAllFiles: 0,
    missingFiles: [],
    orphanedFiles: [],
    workersWithMissingPhotos: 0,
    workersWithPhotos: 0,
  };

  try {
    // 1. Ambil semua submission dengan user data
    const submissions = await prisma.submission.findMany({
      include: {
        user: {
          select: {
            id: true,
            vendor_name: true,
            officer_name: true,
          }
        },
        worker_list: {
          select: {
            id: true,
            worker_name: true,
            worker_photo: true,
          }
        }
      }
    });

    result.totalSubmissions = submissions.length;
    console.log(`📊 Total submission: ${result.totalSubmissions}`);

    // 2. Verifikasi setiap submission
    for (const submission of submissions) {
      let hasMissingFiles = false;
      const baseUploadDir = join(process.cwd(), 'public', 'uploads', submission.user_id);

      // Periksa dokumen SIKA
      if (submission.sika_document_upload) {
        const filePath = getFilePathFromUrl(submission.sika_document_upload, baseUploadDir);
        if (filePath && !existsSync(filePath)) {
          result.missingFiles.push(`SIKA: ${submission.sika_document_upload}`);
          hasMissingFiles = true;
        }
      }

      // Periksa dokumen SIMJA
      if (submission.simja_document_upload) {
        const filePath = getFilePathFromUrl(submission.simja_document_upload, baseUploadDir);
        if (filePath && !existsSync(filePath)) {
          result.missingFiles.push(`SIMJA: ${submission.simja_document_upload}`);
          hasMissingFiles = true;
        }
      }

      // Periksa foto pekerja
      for (const worker of submission.worker_list) {
        if (worker.worker_photo) {
          const filePath = getFilePathFromUrl(worker.worker_photo, baseUploadDir);
          if (filePath && !existsSync(filePath)) {
            result.missingFiles.push(`WORKER PHOTO (${worker.worker_name}): ${worker.worker_photo}`);
            hasMissingFiles = true;
            result.workersWithMissingPhotos++;
          } else if (filePath && existsSync(filePath)) {
            result.workersWithPhotos++;
          }
        } else {
          result.workersWithMissingPhotos++;
        }
      }

      if (hasMissingFiles) {
        result.submissionsWithMissingFiles++;
      } else {
        result.submissionsWithAllFiles++;
      }
    }

    // 3. Laporan hasil
    console.log('\n📋 HASIL VERIFIKASI:');
    console.log(`✅ Submission dengan file lengkap: ${result.submissionsWithAllFiles}`);
    console.log(`❌ Submission dengan file hilang: ${result.submissionsWithMissingFiles}`);
    console.log(`👥 Pekerja dengan foto: ${result.workersWithPhotos}`);
    console.log(`📷 Pekerja tanpa foto: ${result.workersWithMissingPhotos}`);

    if (result.missingFiles.length > 0) {
      console.log('\n🚨 FILE YANG HILANG:');
      result.missingFiles.forEach(file => console.log(`   - ${file}`));
    }

    return result;

  } catch (error) {
    console.error('❌ Error saat verifikasi:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function getFilePathFromUrl(url: string, baseUploadDir: string): string | null {
  try {
    // Parse URL format: /api/files/[userId]/[category]/[filename]
    const match = url.match(/\/api\/files\/[^/]+\/([^/]+)\/(.+)$/);
    if (!match) return null;

    const [, category, filename] = match;
    
    // Map category ke folder
    const categoryFolders = {
      sika: 'dokumen-sika',
      simja: 'dokumen-simja',
      other: 'lainnya',
      'worker-photo': 'foto-pekerja'
    };

    const folderName = categoryFolders[category as keyof typeof categoryFolders];
    if (!folderName) return null;

    return join(baseUploadDir, folderName, filename);
  } catch (error) {
    console.error('Error parsing URL:', url, error);
    return null;
  }
}

async function fixMissingWorkerPhotos() {
  console.log('\n🔧 Memperbaiki data pekerja tanpa foto...');

  try {
    // Ambil semua pekerja tanpa foto
    const workersWithoutPhoto = await prisma.workerList.findMany({
      where: {
        OR: [
          { worker_photo: null },
          { worker_photo: '' }
        ]
      },
      include: {
        submission: {
          select: {
            id: true,
            vendor_name: true,
          }
        }
      }
    });

    console.log(`📋 Ditemukan ${workersWithoutPhoto.length} pekerja tanpa foto`);

    if (workersWithoutPhoto.length > 0) {
      console.log('\n⚠️  PEKERJA TANPA FOTO:');
      workersWithoutPhoto.forEach(worker => {
        console.log(`   - ${worker.worker_name} (Vendor: ${worker.submission.vendor_name})`);
      });
    }

  } catch (error) {
    console.error('❌ Error saat memperbaiki data:', error);
  }
}

async function checkDatabaseConsistency() {
  console.log('\n🔍 Memeriksa konsistensi database...');

  try {
    // 1. Periksa submission tanpa user
    const submissionsWithoutUser = await prisma.submission.findMany({
      where: {
        user: null
      }
    });

    // 2. Periksa worker tanpa submission
    const workersWithoutSubmission = await prisma.workerList.findMany({
      where: {
        submission: null
      }
    });

    console.log(`📊 Submission tanpa user: ${submissionsWithoutUser.length}`);
    console.log(`📊 Workers tanpa submission: ${workersWithoutSubmission.length}`);

    // 3. Periksa field required yang kosong
    const submissionsWithEmptyRequired = await prisma.submission.findMany({
      where: {
        OR: [
          { vendor_name: '' },
          { vendor_name: null },
          { based_on: '' },
          { based_on: null },
          { officer_name: '' },
          { officer_name: null },
          { job_description: '' },
          { job_description: null },
          { work_location: '' },
          { work_location: null },
          { working_hours: '' },
          { working_hours: null },
          { work_facilities: '' },
          { work_facilities: null },
          { worker_names: '' },
          { worker_names: null }
        ]
      },
      select: {
        id: true,
        vendor_name: true,
        created_at: true,
      }
    });

    console.log(`📊 Submission dengan field required kosong: ${submissionsWithEmptyRequired.length}`);

    if (submissionsWithEmptyRequired.length > 0) {
      console.log('\n⚠️  SUBMISSION DENGAN DATA TIDAK LENGKAP:');
      submissionsWithEmptyRequired.forEach(sub => {
        console.log(`   - ID: ${sub.id} | Vendor: ${sub.vendor_name || 'KOSONG'} | Tanggal: ${sub.created_at.toLocaleDateString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error saat cek konsistensi:', error);
  }
}

// Main function
async function main() {
  console.log('🚀 SIMLOK DATA INTEGRITY VERIFICATION\n');
  
  try {
    // 1. Verifikasi integritas file
    await verifyDataIntegrity();
    
    // 2. Perbaiki data pekerja tanpa foto
    await fixMissingWorkerPhotos();
    
    // 3. Periksa konsistensi database
    await checkDatabaseConsistency();
    
    console.log('\n✅ Verifikasi selesai!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Jalankan jika dipanggil langsung
if (require.main === module) {
  main();
}

export { verifyDataIntegrity, fixMissingWorkerPhotos, checkDatabaseConsistency };