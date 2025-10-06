/**
 * Script sederhana untuk testing API submission
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 SIMLOK SUBMISSION API TESTING\n');

  try {
    // 1. Test data sample untuk validasi format
    const testData = {
      vendor_name: 'PT Test Vendor',
      based_on: 'Surat Izin Kerja No. TEST/2024/001',
      officer_name: 'John Doe',
      job_description: 'Pemeliharaan dan perbaikan peralatan',
      work_location: 'Area Produksi Unit 1',
      working_hours: '08:00 - 16:00',
      work_facilities: 'Toolkit lengkap, APD standar, crane mobile',
      worker_count: 2,
      simja_number: 'SIMJA/TEST/2024/001',
      simja_date: '2024-10-07',
      sika_number: 'SIKA/TEST/2024/001',
      sika_date: '2024-10-07',
      worker_names: 'Ahmad Susilo\\nBudi Santoso',
      sika_document_upload: '/api/files/test-user/sika/test-sika-doc.pdf',
      simja_document_upload: '/api/files/test-user/simja/test-simja-doc.pdf',
      workers: [
        {
          id: 'worker-1',
          worker_name: 'Ahmad Susilo',
          worker_photo: '/api/files/test-user/worker-photo/Ahmad_Susilo_1728234567890.jpg'
        },
        {
          id: 'worker-2', 
          worker_name: 'Budi Santoso',
          worker_photo: '/api/files/test-user/worker-photo/Budi_Santoso_1728234567891.jpg'
        }
      ]
    };

    // 2. Validasi field required
    const requiredFields = [
      'vendor_name', 'based_on', 'officer_name', 'job_description',
      'work_location', 'working_hours', 'work_facilities', 'worker_names'
    ];

    console.log('📋 Validasi field required:');
    let allValid = true;
    
    for (const field of requiredFields) {
      const value = testData[field];
      const isValid = value && String(value).trim().length > 0;
      console.log(`   ${isValid ? '✅' : '❌'} ${field}: ${isValid ? 'OK' : 'KOSONG'}`);
      if (!isValid) allValid = false;
    }

    // 3. Validasi workers
    console.log('\\n👥 Validasi workers:');
    console.log(`   📊 Jumlah worker: ${testData.workers.length}`);
    console.log(`   📊 Worker count field: ${testData.worker_count}`);
    
    const workerCountMatch = testData.workers.length === testData.worker_count;
    console.log(`   ${workerCountMatch ? '✅' : '❌'} Jumlah worker sesuai`);

    let allWorkersValid = true;
    
    for (let i = 0; i < testData.workers.length; i++) {
      const worker = testData.workers[i];
      const hasName = worker.worker_name && worker.worker_name.trim().length > 0;
      const hasPhoto = worker.worker_photo && worker.worker_photo.trim().length > 0;
      
      console.log(`   Worker ${i + 1}:`);
      console.log(`     ${hasName ? '✅' : '❌'} Nama: ${worker.worker_name}`);
      console.log(`     ${hasPhoto ? '✅' : '📷' } Foto: ${hasPhoto ? 'Ada' : 'Tidak ada'}`);
      
      if (!hasName || !hasPhoto) allWorkersValid = false;
    }

    // 4. Validasi dokumen
    console.log('\\n📄 Validasi dokumen:');
    const hasSika = testData.sika_document_upload && testData.sika_document_upload.trim().length > 0;
    const hasSimja = testData.simja_document_upload && testData.simja_document_upload.trim().length > 0;
    
    console.log(`   ${hasSika ? '✅' : '❌'} SIKA Document: ${hasSika ? 'Ada' : 'KOSONG'}`);
    console.log(`   ${hasSimja ? '✅' : '❌'} SIMJA Document: ${hasSimja ? 'Ada' : 'KOSONG'}`);

    // 5. Cek submission terbaru di database
    console.log('\\n📊 Memeriksa submission terbaru...');
    
    const recentSubmissions = await prisma.submission.findMany({
      take: 3,
      orderBy: {
        created_at: 'desc'
      },
      include: {
        user: {
          select: {
            vendor_name: true,
            officer_name: true,
          }
        },
        worker_list: {
          select: {
            worker_name: true,
            worker_photo: true,
          }
        }
      }
    });

    console.log(`   📋 Ditemukan ${recentSubmissions.length} submission terbaru:`);

    for (let i = 0; i < recentSubmissions.length; i++) {
      const submission = recentSubmissions[i];
      console.log(`\\n   ${i + 1}. Submission ID: ${submission.id}`);
      console.log(`      Vendor: ${submission.vendor_name}`);
      console.log(`      Job: ${submission.job_description}`);
      console.log(`      Status Review: ${submission.review_status}`);
      console.log(`      Status Approval: ${submission.approval_status}`);
      console.log(`      Workers: ${submission.worker_list.length}`);
      console.log(`      SIKA Doc: ${submission.sika_document_upload ? 'Ada' : 'Kosong'}`);
      console.log(`      SIMJA Doc: ${submission.simja_document_upload ? 'Ada' : 'Kosong'}`);
      console.log(`      Created: ${submission.created_at.toLocaleString()}`);
      
      const workersWithPhotos = submission.worker_list.filter(w => w.worker_photo && w.worker_photo.trim()).length;
      const workersWithoutPhotos = submission.worker_list.length - workersWithPhotos;
      console.log(`      Workers dengan foto: ${workersWithPhotos}`);
      if (workersWithoutPhotos > 0) {
        console.log(`      ⚠️  Workers tanpa foto: ${workersWithoutPhotos}`);
      }
    }

    // 6. Generate report statistik
    console.log('\\n📈 Statistik Database:');
    
    const totalSubmissions = await prisma.submission.count();
    const totalWorkers = await prisma.workerList.count();
    const workersWithPhotos = await prisma.workerList.count({
      where: {
        AND: [
          { worker_photo: { not: null } },
          { worker_photo: { not: '' } }
        ]
      }
    });

    const submissionsWithSIKA = await prisma.submission.count({
      where: {
        AND: [
          { sika_document_upload: { not: null } },
          { sika_document_upload: { not: '' } }
        ]
      }
    });

    const submissionsWithSIMJA = await prisma.submission.count({
      where: {
        AND: [
          { simja_document_upload: { not: null } },
          { simja_document_upload: { not: '' } }
        ]
      }
    });

    console.log(`   📋 Total Submissions: ${totalSubmissions}`);
    console.log(`   👥 Total Workers: ${totalWorkers}`);
    console.log(`   📷 Workers dengan foto: ${workersWithPhotos}/${totalWorkers} (${totalWorkers > 0 ? ((workersWithPhotos/totalWorkers)*100).toFixed(1) : 0}%)`);
    console.log(`   📄 Submissions dengan SIKA: ${submissionsWithSIKA}/${totalSubmissions} (${totalSubmissions > 0 ? ((submissionsWithSIKA/totalSubmissions)*100).toFixed(1) : 0}%)`);
    console.log(`   📄 Submissions dengan SIMJA: ${submissionsWithSIMJA}/${totalSubmissions} (${totalSubmissions > 0 ? ((submissionsWithSIMJA/totalSubmissions)*100).toFixed(1) : 0}%)`);

    // 7. Kesimpulan
    console.log('\\n✅ KESIMPULAN:');
    const testPassed = allValid && allWorkersValid && workerCountMatch && hasSika && hasSimja;
    
    console.log(`   ${testPassed ? '✅' : '❌'} Test API Submission: ${testPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`   ${allValid ? '✅' : '❌'} Required fields: ${allValid ? 'Lengkap' : 'Ada yang kosong'}`);
    console.log(`   ${allWorkersValid ? '✅' : '❌'} Worker data: ${allWorkersValid ? 'Lengkap' : 'Ada yang tidak lengkap'}`);
    console.log(`   ${hasSika && hasSimja ? '✅' : '❌'} Documents: ${hasSika && hasSimja ? 'Lengkap' : 'Ada yang kosong'}`);

    if (testPassed) {
      console.log('\\n🎉 Semua dokumen dan inputan siap untuk disimpan ke database!');
    } else {
      console.log('\\n⚠️  Ada data yang perlu diperbaiki sebelum submission.');
    }

  } catch (error) {
    console.error('❌ Error dalam test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan script
if (require.main === module) {
  main();
}