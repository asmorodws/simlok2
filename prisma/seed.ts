import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("🧹 Membersihkan database sebelum seeding...");
  
  try {
    // Hapus data dengan urutan yang benar (child tables dulu, lalu parent tables)
    await prisma.notificationRead.deleteMany({});
    console.log("   ✓ Semua data notification reads dihapus");
    
    await prisma.notification.deleteMany({});
    console.log("   ✓ Semua data notifications dihapus");
    
    await prisma.qrScan.deleteMany({});
    console.log("   ✓ Semua data QR scans dihapus");
    
    await prisma.workerList.deleteMany({});
    console.log("   ✓ Semua data worker list dihapus");
    
    await prisma.submission.deleteMany({});
    console.log("   ✓ Semua data submission dihapus");
    
    await prisma.refreshToken.deleteMany({});
    console.log("   ✓ Semua data refresh tokens dihapus");
    
    await prisma.session.deleteMany({});
    console.log("   ✓ Semua data sessions dihapus");
    
    await prisma.account.deleteMany({});
    console.log("   ✓ Semua data accounts dihapus");
    
    await prisma.user.deleteMany({});
    console.log("   ✓ Semua data user dihapus");
    
    console.log("🧹 Database berhasil dibersihkan");
  } catch (error) {
    console.error("❌ Error saat membersihkan database:", error);
    throw error;
  }
}

async function main() {
  // Bersihkan database terlebih dahulu
  await cleanDatabase();

  console.log("🌱 Memulai proses seeding...");
  
  const users = [
    {
      officer_name: "Super Admin",
      email: "superadmin@example.com",
      password: "super123", 
      role: "SUPER_ADMIN" as const,
      profile_photo: null,
      address: "Jl. Super Admin No. 1, Jakarta",
      phone_number: "081234567889",
      vendor_name: null, // kosong untuk super admin
      verified_at: new Date(), // super admin sudah terverifikasi
      verified_by: "SYSTEM",
      isActive: true,
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Reviewer Utama",
      email: "reviewer@example.com",
      password: "reviewer123",
      role: "REVIEWER" as const,
      profile_photo: null,
      address: "Jl. Reviewer No. 2, Jakarta",
      phone_number: "081234567888",
      vendor_name: null, // kosong untuk reviewer
      verified_at: new Date(), // reviewer sudah terverifikasi
      verified_by: "SUPER_ADMIN",
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Approver Utama",
      email: "approver@example.com",
      password: "approver123",
      role: "APPROVER" as const,
      profile_photo: null,
      address: "Jl. Approver No. 3, Jakarta",
      phone_number: "081234567887",
      vendor_name: null, // kosong untuk approver
      verified_at: new Date(), // approver sudah terverifikasi
      verified_by: "SUPER_ADMIN",
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Verifier Utama",
      email: "verifier@example.com",
      password: "verifier123",
      role: "VERIFIER" as const,
      profile_photo: null,
      address: "Jl. Verifier No. 4, Jakarta",
      phone_number: "081234567891",
      vendor_name: null, // kosong untuk verifier
      verified_at: new Date(), // verifier sudah terverifikasi
      verified_by: "SUPER_ADMIN",
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Vendor A Petugas",
      email: "vendora@example.com",
      password: "vendor123",
      role: "VENDOR" as const,
      profile_photo: null,
      address: "Jl. Vendor A No. 5, Jakarta",
      phone_number: "081234567892",
      vendor_name: "PT. AHMAD VENDOR SERVICES",
      verified_at: new Date(),
      verified_by: "SUPER_ADMIN",
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Vendor B Petugas",
      email: "vendorb@example.com",
      password: "vendor123",
      role: "VENDOR" as const,
      profile_photo: null,
      address: "Jl. Vendor B No. 6, Bandung",
      phone_number: "081234567893",
      vendor_name: "PT. BUANA KONSTRUKSI",
      verified_at: new Date(),
      verified_by: "SUPER_ADMIN",
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Vendor C Petugas",
      email: "vendorc@example.com",
      password: "vendor123",
      role: "VENDOR" as const,
      profile_photo: null,
      address: "Jl. Vendor C No. 7, Surabaya",
      phone_number: "081234567894",
      vendor_name: "CV. CIPTA MANDIRI",
      verified_at: null, // vendor belum terverifikasi
      verified_by: null,
      verification_status: "PENDING" as const,
    },
    {
      officer_name: "Vendor D Petugas",
      email: "vendord@example.com",
      password: "vendor123",
      role: "VENDOR" as const,
      profile_photo: null,
      address: "Jl. Vendor D No. 8, Medan",
      phone_number: "081234567895",
      vendor_name: "PT. DYNAMIC SOLUTIONS",
      verified_at: null, // vendor belum terverifikasi
      verified_by: null,
      verification_status: "PENDING" as const,
    },
    {
      officer_name: "Vendor E Petugas",
      email: "vendore@example.com",
      password: "vendor123",
      role: "VENDOR" as const,
      profile_photo: null,
      address: "Jl. Vendor E No. 9, Yogyakarta",
      phone_number: "081234567896",
      vendor_name: "CV. EXCELLENT WORKS",
      verified_at: null, // vendor ditolak
      verified_by: null,
      verification_status: "REJECTED" as const,
      rejected_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 hari lalu
      rejected_by: "REVIEWER",
      rejection_reason: "Dokumen tidak lengkap dan tidak sesuai dengan persyaratan yang ditetapkan.",
    },
    {
      officer_name: "Visitor Utama",
      email: "visitor@example.com",
      password: "visitor123",
      role: "VISITOR" as const,
      profile_photo: null,
      address: "Jl. Visitor No. 10, Jakarta",
      phone_number: "081234567897",
      vendor_name: null, // kosong untuk visitor
      verified_at: new Date(), // visitor sudah terverifikasi
      verified_by: "SUPER_ADMIN",
      verification_status: "VERIFIED" as const,
    },
  ];

  console.log("👥 Membuat users...");
  const createdUsers: { [key: string]: any } = {};

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {}, // tidak update kalau sudah ada
      create: {
        officer_name: user.officer_name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        profile_photo: user.profile_photo,
        address: user.address,
        phone_number: user.phone_number,
        vendor_name: user.vendor_name,
        verified_at: user.verified_at,
        verified_by: user.verified_by,
        verification_status: user.verification_status,
      },
    });

    createdUsers[user.email] = createdUser;
  }

  console.log(`   ✓ ${Object.keys(createdUsers).length} users berhasil dibuat`);

  // Create sample submissions
  console.log("📋 Membuat sample submissions...");
  const vendorUsers = Object.values(createdUsers).filter((user: any) => user.role === 'VENDOR');

  const submissionTemplates = [
    {
      based_on: "Kontrak Kerja No. KK/2024/001",
      job_description: "Maintenance Mesin Produksi",
      work_location: "Pabrik Jakarta Plant 1",
      working_hours: "08:00 - 17:00 WIB",
      work_facilities: "Toolkit lengkap, APD standar, crane mobile",
      worker_names: "Ahmad Suharto\nBudi Santoso\nCarlos Wijaya\nDedi Pratama\nEko Setiawan",
    },
    {
      based_on: "SPK No. SPK/2024/002",
      job_description: "Instalasi Sistem Keamanan",
      work_location: "Gedung Kantor Pusat",
      working_hours: "09:00 - 16:00 WIB",
      work_facilities: "Kamera CCTV, kabel, tools instalasi",
      worker_names: "Fajar Nugraha\nGunawan Putra\nHendro Saputra",
    },
    {
      based_on: "Kontrak Pembangunan No. KB/2024/003",
      job_description: "Renovasi Gudang",
      work_location: "Gudang Distribusi Bandung",
      working_hours: "07:00 - 16:00 WIB",
      work_facilities: "Alat berat, material bangunan, scaffolding",
      worker_names: "Irwan Budiman\nJoko Susilo\nKarim Abdullah\nLutfi Rahman\nMaman Suryadi\nNando Pratama\nOktavio Wijaya\nPutra Ramadhan\nQomar Yusuf\nRizky Mahendra",
    },
    {
      based_on: "Work Order No. WO/2024/004",
      job_description: "Pemeliharaan Jaringan IT",
      work_location: "Data Center Jakarta",
      working_hours: "20:00 - 05:00 WIB",
      work_facilities: "Server equipment, testing tools, laptop",
      worker_names: "Sandi Kurniawan\nTeguh Prasetyo",
    },
    {
      based_on: "Kontrak Layanan No. KL/2024/005",
      job_description: "Cleaning Service",
      work_location: "Komplek Perkantoran",
      working_hours: "18:00 - 06:00 WIB",
      work_facilities: "Peralatan cleaning, chemical, vacuum cleaner",
      worker_names: "Usman Hakim\nVina Sari\nWahyu Utomo\nXenia Putri\nYulianto Siswanto\nZainal Abidin\nAni Rahayu\nBayu Setiawan",
    },
    {
      based_on: "SPK No. SPK/2024/006",
      job_description: "Pengecatan Gedung",
      work_location: "Gedung Perkantoran Tower A",
      working_hours: "08:00 - 15:00 WIB",
      work_facilities: "Cat, kuas, roller, scaffolding, drop cloth",
      worker_names: "Candra Wijaya\nDani Hartono\nEdi Susanto\nFarid Nugroho\nGalih Pratama\nHaris Setiawan",
    },
    {
      based_on: "Kontrak Kerja No. KK/2024/007",
      job_description: "Instalasi AC Central",
      work_location: "Mall Jakarta Timur",
      working_hours: "06:00 - 14:00 WIB",
      work_facilities: "Unit AC, ducting, tools HVAC, crane",
      worker_names: "Iman Santoso\nJamal Abdurrahman\nKurnia Sari\nLanang Prasetyo\nMuhammad Rizki\nNurul Hidayah\nOctavianus Putra\nPratama Wijaya",
    },
    {
      based_on: "Work Order No. WO/2024/008",
      job_description: "Perbaikan Jalan Akses",
      work_location: "Area Industri Cikarang",
      working_hours: "07:00 - 17:00 WIB",
      work_facilities: "Aspal, alat berat, roller, marka jalan",
      worker_names: "Qadri Mahfud\nRayhan Saputra\nSusilo Bambang\nTaufik Hidayat\nUmar Bakri\nVandy Kurniawan\nWawan Setiadi\nXavier Gunawan\nYogie Pratama\nZidane Ahmad\nAhmad Fauzi\nBambang Sutrisno",
    },
  ];

  const currentDate = new Date();
  
  // Create multiple submissions for each vendor
  let submissionCount = 0;
  
  for (const vendor of vendorUsers) {
    const vendorData = vendor as any;
    
    // Each vendor gets 2-4 submissions
    const numSubmissions = Math.floor(Math.random() * 3) + 2; // 2-4 submissions
    
    for (let i = 0; i < numSubmissions; i++) {
      const template = submissionTemplates[submissionCount % submissionTemplates.length];
      
      if (!template) {
        console.warn('Template is undefined, skipping submission');
        continue;
      }
      
      // Create date variations
      const createdDate = new Date(currentDate);
      createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 60)); // Random date within last 60 days
      
      const workerNamesArray = template.worker_names.split('\n');
      const workerCount = workerNamesArray.length;
      
      const submissionData: any = {
        vendor_name: vendorData.vendor_name,
        vendor_phone: vendorData.phone_number, // Ambil dari phone number vendor
        based_on: `${template.based_on.split('No.')[0]}No. ${template.based_on.split('/')[1]}/2024/${String(submissionCount + 1).padStart(3, '0')}`,
        officer_name: vendorData.officer_name,
        job_description: template.job_description,
        work_location: template.work_location,
        implementation: null, // akan diisi setelah diapprove
        working_hours: template.working_hours,
        work_facilities: template.work_facilities,
        worker_names: template.worker_names,
        worker_count: workerCount, // Hitung dari worker_names
        content: null, // akan diisi setelah diapprove
        user_id: vendorData.id,
  // Denormalized user fields to preserve vendor info if user is deleted
  user_email: vendorData.email,
  user_officer_name: vendorData.officer_name,
  user_vendor_name: vendorData.vendor_name,
  user_phone_number: vendorData.phone_number,
  user_address: vendorData.address,
        review_status: "PENDING_REVIEW", // Semua pending review dari reviewer
        approval_status: "PENDING_APPROVAL", // Semua pending final approval dari approver
        note_for_approver: null, // belum ada review
        note_for_vendor: null, // belum ada final note
        reviewed_by: null, // belum di-review
        reviewed_at: null, // belum di-review
        approved_by: null, // belum diapprove
        approved_by_final_id: null, // belum diapprove final
        approved_at: null, // belum diapprove
        qrcode: '', // akan diisi setelah diapprove
        created_at: createdDate,
        // Semua submission memiliki nomor dan tanggal SIKA dan SIMJA
        simja_number: `SIMJA/2024/${String(submissionCount + 1).padStart(4, '0')}`,
        simja_date: new Date(createdDate.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000), // 0-10 hari sebelum created_at
        sika_number: `SIKA/2024/${String(submissionCount + 1).padStart(4, '0')}`,
        sika_date: new Date(createdDate.getTime() - Math.random() * 15 * 24 * 60 * 60 * 1000), // 0-15 hari sebelum created_at
        simlok_number: null, // akan diisi setelah diapprove
        simlok_date: null, // akan diisi setelah diapprove
        implementation_start_date: null, // akan diisi setelah diapprove
        implementation_end_date: null, // akan diisi setelah diapprove
        signer_position: null, // akan diisi setelah diapprove
        signer_name: null, // akan diisi setelah diapprove
        sika_document_upload: null, // bisa diupload vendor
        simja_document_upload: null, // bisa diupload vendor
      };

      // Semua submission dibuat dengan status PENDING untuk testing review workflow
      // Reviewer/Super Admin akan review melalui UI
      // Approver akan melakukan final approval melalui UI
      // QR Code akan dibuat otomatis setelah final approval

      const createdSubmission = await prisma.submission.create({
        data: submissionData,
      });

      // Create worker list for this submission
      for (const workerName of workerNamesArray) {
        await prisma.workerList.create({
          data: {
            worker_name: workerName.trim(),
            worker_photo: null, // akan diupload nanti
            submission_id: createdSubmission.id,
          },
        });
      }
      
      submissionCount++;
    }
  }

  console.log(`   ✓ ${submissionCount} submissions berhasil dibuat`);

  // Update some submissions to APPROVED status so we can create QR scans for them
  console.log("🔄 Mengupdate beberapa submissions menjadi APPROVED untuk testing QR scan...");
  
  const reviewerUser = createdUsers['reviewer@example.com'];
  const approverUser = createdUsers['approver@example.com'];
  const verifierUser = createdUsers['verifier@example.com'];
  
  // Get first 5 submissions to be approved
  const submissionsToApprove = await prisma.submission.findMany({
    take: 5,
    orderBy: { created_at: 'asc' }
  });

  const approvedSubmissions: any[] = [];
  
  for (const submission of submissionsToApprove) {
    const reviewedAt = new Date(new Date(submission.created_at).getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000); // 0-7 hari setelah created
    const approvedAt = new Date(reviewedAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000); // 0-3 hari setelah reviewed
    
    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        review_status: 'MEETS_REQUIREMENTS',
        approval_status: 'APPROVED',
        note_for_approver: 'Semua dokumen lengkap dan memenuhi persyaratan keselamatan kerja.',
        note_for_vendor: 'Disetujui untuk pelaksanaan. Pastikan mengikuti protokol keselamatan.',
        reviewed_by: reviewerUser.officer_name,
        reviewed_at: reviewedAt,
        approved_by: approverUser.officer_name,
        approved_by_final_id: approverUser.id,
        approved_at: approvedAt,
        simlok_number: `SIMLOK/2024/${String(approvedSubmissions.length + 1).padStart(4, '0')}`,
        simlok_date: approvedAt,
        implementation_start_date: new Date(approvedAt.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 hari setelah approval
        implementation_end_date: new Date(approvedAt.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 hari setelah approval
        signer_position: 'Manager Operasional',
        signer_name: 'Dr. Ir. Budi Santoso, M.T.',
        qrcode: `QR-${submission.id.slice(-8).toUpperCase()}-2024`,
        content: `Pelaksanaan pekerjaan ${submission.job_description} di lokasi ${submission.work_location}. Berlaku mulai ${new Date(approvedAt.getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID')} sampai ${new Date(approvedAt.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID')}.`,
        implementation: `Pekerjaan dilaksanakan sesuai jadwal kerja ${submission.working_hours} dengan menggunakan fasilitas ${submission.work_facilities}. Semua pekerja wajib menggunakan APD lengkap dan mengikuti protokol keselamatan kerja.`
      }
    });
    
    approvedSubmissions.push(updatedSubmission);
  }

  console.log(`   ✓ ${approvedSubmissions.length} submissions berhasil diupdate menjadi APPROVED`);

  // Create QR scan data
  console.log("� Membuat sample QR scans...");
  
  const scanLocations = [
    'Gerbang Utama Plant 1',
    'Area Produksi Lantai 2',
    'Gudang Material',
    'Kantor Site Manager',
    'Area Parkir Kontraktor',
    'Pos Keamanan',
    'Ruang Meeting',
    'Area Workshop',
    'Kantin Karyawan',
    'Toilet Umum'
  ];

  // const scanNotes = [
  //   'Scan masuk shift pagi - semua pekerja hadir',
  //   'Pemeriksaan rutin tengah hari',
  //   'Scan keluar untuk istirahat makan siang',
  //   'Kembali dari istirahat - lanjut kerja',
  //   'Scan akhir shift - pekerjaan selesai',
  //   'Pemeriksaan keamanan area kerja',
  //   'Verifikasi peralatan kerja',
  //   'Scan darurat - pemeriksaan insiden',
  //   'Scan rutin supervisor',
  //   'Pemeriksaan akhir hari'
  // ];

  let qrScanCount = 0;
  
  for (const submission of approvedSubmissions) {
    // Each approved submission gets 3-8 QR scans
    const numScans = Math.floor(Math.random() * 6) + 3; // 3-8 scans
    
    const submissionStartDate = new Date(submission.implementation_start_date || submission.approved_at || submission.created_at);
    
    for (let i = 0; i < numScans; i++) {
      // Create scan dates between implementation start and now
      const maxDaysFromStart = Math.min(30, Math.floor((Date.now() - submissionStartDate.getTime()) / (24 * 60 * 60 * 1000)));
      const scanDate = new Date(submissionStartDate.getTime() + Math.random() * maxDaysFromStart * 24 * 60 * 60 * 1000);
      
      // Add some time variation during the day (work hours)
      scanDate.setHours(Math.floor(Math.random() * 10) + 7, Math.floor(Math.random() * 60)); // 07:00 - 16:59
      
      const qrScanData = {
        submission_id: submission.id,
        scanned_by: verifierUser.id,
        scanned_at: scanDate,
        scanner_name: verifierUser.officer_name,
        scan_location: scanLocations[Math.floor(Math.random() * scanLocations.length)] || null,

      };

      await prisma.qrScan.create({
        data: qrScanData,
      });
      
      qrScanCount++;
    }
  }

  console.log(`   ✓ ${qrScanCount} QR scans berhasil dibuat`);

  // All remaining submissions stay PENDING for review and final approval
  console.log("📋 Sisa submissions tetap dengan status PENDING_REVIEW dan PENDING_APPROVAL");
  console.log("   ✓ Reviewer dapat melakukan review submissions");
  console.log("   ✓ Approver dapat melakukan final approval setelah review");
  console.log("   ✓ QR codes akan dibuat setelah approval final");

  console.log("🔔 Tidak membuat notification seed data");
  console.log("");
  console.log("✅ Seeding selesai dengan sukses!");
  console.log("");
  console.log("📊 Ringkasan data yang dibuat:");
  console.log(`   👥 ${Object.keys(createdUsers).length} users (termasuk super admin, reviewer, approver, verifier, vendor)`);
  console.log(`   📋 ${submissionCount} submissions total:`);
  console.log(`      - ${approvedSubmissions.length} submissions APPROVED (dengan QR code)`);
  console.log(`      - ${submissionCount - approvedSubmissions.length} submissions PENDING (untuk testing review & approval)`);
  console.log(`   📱 ${qrScanCount} QR scans (untuk submissions yang sudah APPROVED)`);
  console.log("");
  console.log("🎯 Workflow yang dapat ditest:");
  console.log("   1. Login sebagai Reviewer untuk melakukan review submissions PENDING");
  console.log("   2. Login sebagai Approver untuk melakukan final approval submissions");
  console.log("   3. Login sebagai Verifier untuk melakukan QR scan pada submissions APPROVED");
  console.log("   4. Login sebagai Vendor untuk melihat status submissions");
  console.log("   5. Lihat riwayat QR scan pada submissions yang sudah APPROVED");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
