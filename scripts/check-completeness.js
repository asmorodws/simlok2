/**
 * Script untuk membantu melengkapi data submission yang belum lengkap
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findIncompleteSubmissions() {
  console.log('🔍 Mencari submission yang belum lengkap...\n');

  try {
    // 1. Submission tanpa dokumen SIKA
    const withoutSIKA = await prisma.submission.findMany({
      where: {
        OR: [
          { sika_document_upload: null },
          { sika_document_upload: '' }
        ]
      },
      select: {
        id: true,
        vendor_name: true,
        job_description: true,
        created_at: true,
        user: {
          select: {
            vendor_name: true,
            officer_name: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // 2. Submission tanpa dokumen SIMJA
    const withoutSIMJA = await prisma.submission.findMany({
      where: {
        OR: [
          { simja_document_upload: null },
          { simja_document_upload: '' }
        ]
      },
      select: {
        id: true,
        vendor_name: true,
        job_description: true,
        created_at: true,
        user: {
          select: {
            vendor_name: true,
            officer_name: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // 3. Workers tanpa foto
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
            job_description: true,
            user: {
              select: {
                vendor_name: true,
                officer_name: true,
              }
            }
          }
        }
      },
      take: 10 // Batasi output
    });

    console.log('📊 HASIL ANALISIS:\n');
    
    console.log(`❌ Submission tanpa dokumen SIKA: ${withoutSIKA.length}`);
    if (withoutSIKA.length > 0) {
      console.log('   Submission terbaru yang perlu dilengkapi:');
      withoutSIKA.slice(0, 5).forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.vendor_name} - ${sub.job_description.substring(0, 40)}...`);
        console.log(`      ID: ${sub.id} | Created: ${sub.created_at.toLocaleDateString()}`);
      });
      if (withoutSIKA.length > 5) {
        console.log(`   ... dan ${withoutSIKA.length - 5} submission lainnya\n`);
      }
    }

    console.log(`❌ Submission tanpa dokumen SIMJA: ${withoutSIMJA.length}`);
    if (withoutSIMJA.length > 0) {
      console.log('   Submission terbaru yang perlu dilengkapi:');
      withoutSIMJA.slice(0, 5).forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.vendor_name} - ${sub.job_description.substring(0, 40)}...`);
        console.log(`      ID: ${sub.id} | Created: ${sub.created_at.toLocaleDateString()}`);
      });
      if (withoutSIMJA.length > 5) {
        console.log(`   ... dan ${withoutSIMJA.length - 5} submission lainnya\n`);
      }
    }

    console.log(`📷 Workers tanpa foto: ${workersWithoutPhoto.length} (dari total workers)`);
    if (workersWithoutPhoto.length > 0) {
      console.log('   Beberapa pekerja yang perlu foto:');
      workersWithoutPhoto.slice(0, 10).forEach((worker, index) => {
        console.log(`   ${index + 1}. ${worker.worker_name} (${worker.submission.vendor_name})`);
      });
    }

    // 4. Rekomendasi tindakan
    console.log('\n🔧 REKOMENDASI TINDAKAN:\n');
    
    if (withoutSIKA.length > 0 || withoutSIMJA.length > 0) {
      console.log('📄 Untuk Dokumen:');
      console.log('   1. Hubungi vendor untuk melengkapi dokumen yang hilang');
      console.log('   2. Gunakan fitur edit submission untuk update dokumen');
      console.log('   3. Pastikan dokumen dalam format PDF/DOC/DOCX');
      console.log('   4. Ukuran file maksimal 8MB\n');
    }

    if (workersWithoutPhoto.length > 0) {
      console.log('📷 Untuk Foto Pekerja:');
      console.log('   1. Minta vendor upload foto untuk semua pekerja');
      console.log('   2. Foto harus jelas dan format JPG/PNG');
      console.log('   3. Sistem akan otomatis kompres foto > 500KB');
      console.log('   4. Foto digunakan untuk verifikasi identitas\n');
    }

    // 5. Progress tracking
    const totalSubmissions = await prisma.submission.count();
    const totalWorkers = await prisma.workerList.count();
    
    const completeSubmissions = totalSubmissions - Math.max(withoutSIKA.length, withoutSIMJA.length);
    const workersWithPhoto = totalWorkers - workersWithoutPhoto.length;

    console.log('📈 PROGRESS KELENGKAPAN DATA:\n');
    console.log(`   Submission lengkap: ${completeSubmissions}/${totalSubmissions} (${((completeSubmissions/totalSubmissions)*100).toFixed(1)}%)`);
    console.log(`   Workers dengan foto: ${workersWithPhoto}/${totalWorkers} (${((workersWithPhoto/totalWorkers)*100).toFixed(1)}%)`);

    if (completeSubmissions === totalSubmissions && workersWithPhoto === totalWorkers) {
      console.log('\n🎉 SEMUA DATA SUDAH LENGKAP! ');
      console.log('   Tidak ada tindakan lebih lanjut yang diperlukan.');
    } else {
      const totalMissing = (totalSubmissions - completeSubmissions) + (totalWorkers - workersWithPhoto);
      console.log(`\n⚠️  Masih ada ${totalMissing} item yang perlu dilengkapi.`);
    }

    return {
      withoutSIKA: withoutSIKA.length,
      withoutSIMJA: withoutSIMJA.length,
      workersWithoutPhoto: workersWithoutPhoto.length,
      totalSubmissions,
      totalWorkers
    };

  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

async function generateCompletionReport() {
  console.log('📋 LAPORAN KELENGKAPAN DATA SIMLOK\n');
  console.log(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`);
  console.log(`Waktu: ${new Date().toLocaleTimeString('id-ID')}\n`);

  const result = await findIncompleteSubmissions();
  
  if (result) {
    const {
      withoutSIKA,
      withoutSIMJA,
      workersWithoutPhoto,
      totalSubmissions,
      totalWorkers
    } = result;

    console.log('\n📊 RINGKASAN:');
    console.log('=====================================');
    console.log(`Total Submissions: ${totalSubmissions}`);
    console.log(`Total Workers: ${totalWorkers}`);
    console.log(`Missing SIKA docs: ${withoutSIKA}`);
    console.log(`Missing SIMJA docs: ${withoutSIMJA}`);
    console.log(`Missing worker photos: ${workersWithoutPhoto}`);
    
    const completionRate = ((totalSubmissions - Math.max(withoutSIKA, withoutSIMJA) + totalWorkers - workersWithoutPhoto) / (totalSubmissions + totalWorkers)) * 100;
    console.log(`Overall completion: ${completionRate.toFixed(1)}%`);
    console.log('=====================================');

    if (completionRate >= 90) {
      console.log('\n✅ STATUS: EXCELLENT - Data hampir lengkap!');
    } else if (completionRate >= 70) {
      console.log('\n⚠️  STATUS: GOOD - Perlu sedikit perbaikan');
    } else if (completionRate >= 50) {
      console.log('\n🔶 STATUS: FAIR - Perlu perbaikan signifikan');
    } else {
      console.log('\n🔴 STATUS: POOR - Perlu perbaikan besar');
    }
  }
}

async function main() {
  try {
    await generateCompletionReport();
  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}