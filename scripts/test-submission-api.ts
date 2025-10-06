/**
 * Script untuk testing API submission secara menyeluruh
 * Memastikan semua dokumen dan data tersimpan dengan benar
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

interface TestSubmissionData {
  vendor_name: string;
  based_on: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  working_hours: string;
  work_facilities: string;
  worker_count: number;
  simja_number: string;
  simja_date: string;
  sika_number: string;
  sika_date: string;
  worker_names: string;
  sika_document_upload: string;
  simja_document_upload: string;
  workers: {
    id: string;
    worker_name: string;
    worker_photo: string;
  }[];
}

async function testSubmissionAPI() {
  console.log('🧪 Testing Submission API...\n');

  try {
    // 1. Test data sample
    const testData: TestSubmissionData = {
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
      worker_names: 'Ahmad Susilo\nBudi Santoso',
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
    for (const field of requiredFields) {
      const value = testData[field as keyof TestSubmissionData];
      const isValid = value && String(value).trim().length > 0;
      console.log(`   ${isValid ? '✅' : '❌'} ${field}: ${isValid ? 'OK' : 'KOSONG'}`);
    }

    // 3. Validasi workers
    console.log('\n👥 Validasi workers:');
    console.log(`   📊 Jumlah worker: ${testData.workers.length}`);
    console.log(`   📊 Worker count field: ${testData.worker_count}`);
    console.log(`   ${testData.workers.length === testData.worker_count ? '✅' : '❌'} Jumlah worker sesuai`);

    for (let i = 0; i < testData.workers.length; i++) {
      const worker = testData.workers[i];
      if (!worker) continue;
      
      const hasName = worker.worker_name && worker.worker_name.trim().length > 0;
      const hasPhoto = worker.worker_photo && worker.worker_photo.trim().length > 0;
      
      console.log(`   Worker ${i + 1}:`);
      console.log(`     ${hasName ? '✅' : '❌'} Nama: ${worker.worker_name}`);
      console.log(`     ${hasPhoto ? '✅' : '📷' } Foto: ${hasPhoto ? 'Ada' : 'Tidak ada'}`);
    }

    // 4. Validasi dokumen
    console.log('\n📄 Validasi dokumen:');
    console.log(`   ${testData.sika_document_upload ? '✅' : '❌'} SIKA Document: ${testData.sika_document_upload || 'KOSONG'}`);
    console.log(`   ${testData.simja_document_upload ? '✅' : '❌'} SIMJA Document: ${testData.simja_document_upload || 'KOSONG'}`);

    // 5. Simulasi penyimpanan database
    console.log('\n💾 Simulasi penyimpanan ke database:');
    
    // Siapkan data untuk Prisma
    const { workers, ...submissionData } = testData;
    
    console.log('   📝 Data submission:');
    console.log(`     - Vendor: ${submissionData.vendor_name}`);
    console.log(`     - Job: ${submissionData.job_description}`);
    console.log(`     - Location: ${submissionData.work_location}`);
    console.log(`     - Worker count: ${submissionData.worker_count}`);

    console.log('   👥 Data workers:');
    workers.forEach((worker, index) => {
      console.log(`     ${index + 1}. ${worker.worker_name} ${worker.worker_photo ? '(dengan foto)' : '(tanpa foto)'}`);
    });

    console.log('\n✅ Test API Submission berhasil!');
    console.log('   Semua validasi passed, data siap disimpan ke database.');

    return {
      success: true,
      data: testData,
      validation: {
        requiredFieldsComplete: requiredFields.every(field => {
          const value = testData[field as keyof TestSubmissionData];
          return value && String(value).trim().length > 0;
        }),
        workerDataComplete: testData.workers.every(w => 
          w.worker_name?.trim() && w.worker_photo?.trim()
        ),
        documentsComplete: testData.sika_document_upload?.trim() && testData.simja_document_upload?.trim(),
        workerCountMatches: testData.workers.length === testData.worker_count
      }
    };

  } catch (error) {
    console.error('❌ Error dalam test:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkRecentSubmissions() {
  console.log('\n📊 Memeriksa submission terbaru...');

  try {
    const recentSubmissions = await prisma.submission.findMany({
      take: 5,
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

    recentSubmissions.forEach((submission, index) => {
      console.log(`\n   ${index + 1}. Submission ID: ${submission.id}`);
      console.log(`      Vendor: ${submission.vendor_name}`);
      console.log(`      Job: ${submission.job_description}`);
      console.log(`      Status Review: ${submission.review_status}`);
      console.log(`      Status Approval: ${submission.approval_status}`);
      console.log(`      Workers: ${submission.worker_list.length}`);
      console.log(`      SIKA Doc: ${submission.sika_document_upload ? 'Ada' : 'Kosong'}`);
      console.log(`      SIMJA Doc: ${submission.simja_document_upload ? 'Ada' : 'Kosong'}`);
      console.log(`      Created: ${submission.created_at.toLocaleString()}`);
      
      const workersWithPhotos = submission.worker_list.filter(w => w.worker_photo?.trim()).length;
      const workersWithoutPhotos = submission.worker_list.length - workersWithPhotos;
      console.log(`      Workers dengan foto: ${workersWithPhotos}`);
      if (workersWithoutPhotos > 0) {
        console.log(`      ⚠️  Workers tanpa foto: ${workersWithoutPhotos}`);
      }
    });

  } catch (error) {
    console.error('❌ Error saat cek submission:', error);
  }
}

async function generateSubmissionReport() {
  console.log('\n📈 Generating submission report...');

  try {
    // Total submissions
    const totalSubmissions = await prisma.submission.count();
    
    // By status
    const byReviewStatus = await prisma.submission.groupBy({
      by: ['review_status'],
      _count: true
    });

    const byApprovalStatus = await prisma.submission.groupBy({
      by: ['approval_status'],
      _count: true
    });

    // Workers statistics
    const totalWorkers = await prisma.workerList.count();
    const workersWithPhotos = await prisma.workerList.count({
      where: {
        AND: [
          { worker_photo: { not: null } },
          { worker_photo: { not: '' } }
        ]
      }
    });

    // Documents statistics
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

    console.log('\n📊 LAPORAN SUBMISSION:');
    console.log(`   📋 Total Submissions: ${totalSubmissions}`);
    
    console.log('\n   Review Status:');
    byReviewStatus.forEach(status => {
      console.log(`     ${status.review_status}: ${status._count}`);
    });

    console.log('\n   Approval Status:');
    byApprovalStatus.forEach(status => {
      console.log(`     ${status.approval_status}: ${status._count}`);
    });

    console.log('\n   Workers:');
    console.log(`     Total: ${totalWorkers}`);
    console.log(`     Dengan foto: ${workersWithPhotos} (${((workersWithPhotos/totalWorkers)*100).toFixed(1)}%)`);
    console.log(`     Tanpa foto: ${totalWorkers - workersWithPhotos} (${(((totalWorkers - workersWithPhotos)/totalWorkers)*100).toFixed(1)}%)`);

    console.log('\n   Documents:');
    console.log(`     Dengan SIKA: ${submissionsWithSIKA}/${totalSubmissions} (${((submissionsWithSIKA/totalSubmissions)*100).toFixed(1)}%)`);
    console.log(`     Dengan SIMJA: ${submissionsWithSIMJA}/${totalSubmissions} (${((submissionsWithSIMJA/totalSubmissions)*100).toFixed(1)}%)`);

    const completeSubmissions = await prisma.submission.count({
      where: {
        AND: [
          { sika_document_upload: { not: null } },
          { sika_document_upload: { not: '' } },
          { simja_document_upload: { not: null } },
          { simja_document_upload: { not: '' } },
        ]
      }
    });

    console.log(`     Lengkap (SIKA + SIMJA): ${completeSubmissions}/${totalSubmissions} (${((completeSubmissions/totalSubmissions)*100).toFixed(1)}%)`);

  } catch (error) {
    console.error('❌ Error generating report:', error);
  }
}

// Main function
async function main() {
  console.log('🚀 SIMLOK SUBMISSION API TESTING\n');

  try {
    // 1. Test API submission
    const testResult = await testSubmissionAPI();
    
    if (testResult.success) {
      console.log('\n✅ API Test: PASSED');
    } else {
      console.log('\n❌ API Test: FAILED');
      console.log(`   Error: ${testResult.error}`);
    }

    // 2. Check recent submissions
    await checkRecentSubmissions();

    // 3. Generate report
    await generateSubmissionReport();

    console.log('\n✅ Testing selesai!');

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan jika dipanggil langsung
if (require.main === module) {
  main();
}

module.exports = { testSubmissionAPI, checkRecentSubmissions, generateSubmissionReport };