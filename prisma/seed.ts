import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
      officer_name: "Admin Utama",
      email: "admin@example.com",
      password: "admin123",
      role: "ADMIN" as const,
      profile_photo: null,
      address: "Jl. Admin No. 1, Jakarta",
      phone_number: "081234567890",
      vendor_name: null, // kosong untuk admin
      verified_at: new Date(), // admin sudah terverifikasi
      verified_by: "SYSTEM",
    },
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
      verified_by: "ADMIN",
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
      verified_by: "ADMIN",
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
      verified_by: "ADMIN",
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
      verified_by: "ADMIN",
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
      verified_by: "ADMIN",
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
      
      const status = 'PENDING'; // Semua submission pending
      
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
        implementation: null, // akan diisi admin saat approve
        working_hours: template.working_hours,
        other_notes: null, // akan diisi admin saat approve
        work_facilities: template.work_facilities,
        worker_names: template.worker_names,
        worker_count: workerCount, // Hitung dari worker_names
        content: null, // akan diisi admin saat approve
        user_id: vendorData.id,
        approval_status: status,
        review_status: "PENDING_REVIEW", // Default review status
        final_status: "PENDING_APPROVAL", // Default final status
        qrcode: '',
        created_at: createdDate,
        simja_number: submissionCount % 2 === 0 ? `SIMJA/2024/${String(submissionCount + 1).padStart(3, '0')}` : null,
        simja_date: submissionCount % 2 === 0 ? new Date(createdDate.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null,
        sika_number: submissionCount % 3 === 0 ? `SIKA/2024/${String(submissionCount + 1).padStart(3, '0')}` : null,
        sika_date: submissionCount % 3 === 0 ? new Date(createdDate.getTime() - Math.random() * 15 * 24 * 60 * 60 * 1000) : null,
        implementation_start_date: null,
        implementation_end_date: null,
      };

      // Semua submission pending - tidak ada approval data
      // Admin akan mengisi data saat approve melalui UI

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

  // Update some submissions to be APPROVED and add QR scans
  console.log("📊 Mengupdate beberapa submissions menjadi APPROVED dan menambahkan QR scans...");
  
  const approverUser = createdUsers['approver@example.com'];
  const verifierUser = createdUsers['verifier@example.com'];
  const reviewerUser = createdUsers['reviewer@example.com'];
  
  if (!approverUser || !verifierUser || !reviewerUser) {
    console.error("❌ Required users not found for QR scan seeding");
    return;
  }
  
  // Get all submissions
  const allSubmissions = await prisma.submission.findMany({
    orderBy: { created_at: 'asc' }
  });
  
  // Update 60% of submissions to APPROVED status with SIMLOK numbers
  const submissionsToApprove = allSubmissions.slice(0, Math.floor(allSubmissions.length * 0.6));
  
  for (let i = 0; i < submissionsToApprove.length; i++) {
    const submission = submissionsToApprove[i];
    if (!submission) continue;
    
    const simlokNumber = `SIMLOK/${new Date().getFullYear()}/${String(i + 1).padStart(4, '0')}`;
    const simlokDate = new Date(submission.created_at.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000); // 0-7 days after creation
    
    // Create implementation dates
    const implStartDate = new Date(simlokDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000); // 0-3 days after SIMLOK
    const implEndDate = new Date(implStartDate.getTime() + (Math.random() * 14 + 1) * 24 * 60 * 60 * 1000); // 1-15 days duration
    
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        approval_status: 'APPROVED',
        simlok_number: simlokNumber,
        simlok_date: simlokDate,
        approved_by: approverUser.id,
        reviewed_by_id: reviewerUser.id,
        reviewed_at: new Date(simlokDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 hari sebelum simlok
        review_status: 'MEETS_REQUIREMENTS',
        review_note: `Dokumen lengkap dan sesuai persyaratan untuk ${submission.job_description}`,
        approved_by_final_id: approverUser.id,
        approved_at: simlokDate,
        final_status: 'APPROVED',
        final_note: `Disetujui untuk pelaksanaan di ${submission.work_location}`,
        implementation: `Terhitung mulai tanggal ${implStartDate.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long', 
          year: 'numeric'
        })} sampai ${implEndDate.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long', 
          year: 'numeric'
        })}. Termasuk hari Sabtu, Minggu dan hari libur lainnya.`,
        implementation_start_date: implStartDate,
        implementation_end_date: implEndDate,
        content: `Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis.`,
        other_notes: `Izin diberikan berdasarkan:\n${submission.simja_number ? `• Simja Ast Man Facility Management\n  ${submission.simja_number} Tgl. ${submission.simja_date ? submission.simja_date.toLocaleDateString('id-ID') : ''}\n` : ''}${submission.sika_number ? `• SIKA Pekerjaan Dingin\n  ${submission.sika_number} Tgl. ${submission.sika_date ? submission.sika_date.toLocaleDateString('id-ID') : ''}\n` : ''}  Diterima Sr Officer Security III\n  ${simlokDate.toLocaleDateString('id-ID')}`,
        signer_position: 'Sr Officer Security III',
        signer_name: 'Julianto Santoso',
        qrcode: `{"submissionId":"${submission.id}","simlokNumber":"${simlokNumber}","vendorName":"${submission.vendor_name}","type":"SIMLOK_QR"}`,
      }
    });
  }
  
  console.log(`   ✓ ${submissionsToApprove.length} submissions diupdate ke status APPROVED`);
  
  // Create some submissions with NOT_MEETS_REQUIREMENTS status
  console.log("❌ Membuat submissions dengan status NOT_MEETS_REQUIREMENTS...");
  const remainingSubmissions = await prisma.submission.findMany({
    where: {
      review_status: 'PENDING_REVIEW'
    },
    take: 3 // Ambil 3 submission untuk dijadikan NOT_MEETS_REQUIREMENTS
  });

  for (let i = 0; i < remainingSubmissions.length; i++) {
    const submission = remainingSubmissions[i];
    if (!submission) continue;
    
    const rejectionReasons = [
      'Dokumen SIMJA tidak lengkap atau tidak sesuai',
      'Dokumen SIKA tidak memenuhi standar keselamatan',
      'Data pekerja tidak lengkap atau tidak valid'
    ];

    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        reviewed_by_id: reviewerUser.id,
        reviewed_at: new Date(submission.created_at.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000), // 0-5 days after creation
        review_status: 'NOT_MEETS_REQUIREMENTS',
        review_note: rejectionReasons[i] || 'Dokumen tidak memenuhi persyaratan yang ditetapkan',
        final_status: 'PENDING_APPROVAL', // Tetap menunggu keputusan final dari approver
      }
    });
  }
  
  console.log(`   ✓ ${remainingSubmissions.length} submissions diupdate ke status NOT_MEETS_REQUIREMENTS`);
  
  // Add QR Scans for approved submissions
  console.log("🔍 Menambahkan data QR scans untuk submissions yang sudah diapprove...");
  
  const approvedSubmissions = await prisma.submission.findMany({
    where: { approval_status: 'APPROVED' },
    orderBy: { simlok_date: 'asc' }
  });
  
  let qrScanCount = 0;
  
  // Create QR scans for 80% of approved submissions (some scanned multiple times)
  const submissionsToScan = approvedSubmissions.slice(0, Math.floor(approvedSubmissions.length * 0.8));
  
  for (const submission of submissionsToScan) {
    if (!submission.simlok_date || !submission.implementation_end_date) continue;
    
    // Create 1-3 QR scans per submission (simulate multiple scans)
    const numScans = Math.floor(Math.random() * 3) + 1; // 1-3 scans
    
    for (let scanIndex = 0; scanIndex < numScans; scanIndex++) {
      // Create scan dates between SIMLOK date and implementation end date
      const scanDate = new Date(
        submission.simlok_date.getTime() + 
        Math.random() * (submission.implementation_end_date.getTime() - submission.simlok_date.getTime())
      );
      
      // Add some variation to scan locations
      const scanLocations = [
        'Pos Security Entrance',
        'Area Kerja Utama', 
        'Site Office',
        'Safety Checkpoint',
        'Main Gate',
        'Project Site',
        'Supervisor Office',
        'Quality Control Point'
      ];
      
      const scanLocation = scanLocations[Math.floor(Math.random() * scanLocations.length)];
      
      const scanNotes = [
        'Verifikasi rutin dokumen SIMLOK',
        'Pemeriksaan saat masuk area kerja',
        'Kontrol kualitas dokumen',
        'Verifikasi sebelum mulai kerja',
        'Pemeriksaan keamanan',
        'Audit compliance dokumen',
        'Verifikasi kelengkapan tim',
        'Kontrol akses area restricted'
      ];
      
      const selectedNote = scanNotes[Math.floor(Math.random() * scanNotes.length)];
      
      await prisma.qrScan.create({
        data: {
          submission_id: submission.id,
          scanned_by: verifierUser.id,
          scanned_at: scanDate,
          scanner_name: verifierUser.officer_name,
          scan_location: scanLocation || null,
          notes: selectedNote || null,
        }
      });
      
      qrScanCount++;
    }
  }
  
  // Add some recent scans (within last 7 days) for dashboard stats
  const recentApprovedSubmissions = approvedSubmissions.slice(0, 5);
  for (const submission of recentApprovedSubmissions) {
    const recentScanDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Within last 7 days
    
    await prisma.qrScan.create({
      data: {
        submission_id: submission.id,
        scanned_by: verifierUser.id,
        scanned_at: recentScanDate,
        scanner_name: verifierUser.officer_name,
        scan_location: 'Mobile Verification',
        notes: 'Verifikasi lapangan menggunakan aplikasi mobile',
      }
    });
    
    qrScanCount++;
  }
  
  console.log(`   ✓ ${qrScanCount} QR scans berhasil dibuat`);

  // Create sample notifications
  console.log("🔔 Membuat sample notifications...");
  
  // Create vendor registration notifications
  const unverifiedVendors = Object.values(createdUsers).filter((user: any) => user.role === 'VENDOR' && !user.verified_at);
  
  for (const vendor of unverifiedVendors) {
    const vendorData = vendor as any;
    
    // Create admin notification for new vendor registration
    await prisma.notification.create({
      data: {
        scope: 'admin',
        vendor_id: null,
        type: 'new_vendor',
        title: 'Pendaftaran Vendor Baru',
        message: `Vendor baru mendaftar: ${vendorData.vendor_name}`,
        data: JSON.stringify({
          vendorId: vendorData.id,
          vendorName: vendorData.vendor_name,
          officerName: vendorData.officer_name,
        }),
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random dalam 7 hari terakhir
      },
    });
  }

  // Create submission notifications
  const recentSubmissions = await prisma.submission.findMany({
    where: {
      created_at: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 hari terakhir
      },
    },
    include: {
      user: true,
    },
  });

  for (const submission of recentSubmissions.slice(0, 5)) { // Ambil 5 submission terbaru
    // Create admin notification for new submission
    await prisma.notification.create({
      data: {
        scope: 'admin',
        vendor_id: null,
        type: 'new_submission',
        title: 'Pengajuan Baru',
        message: `Pengajuan baru dari ${submission.vendor_name}: ${submission.job_description}`,
        data: JSON.stringify({
          submissionId: submission.id,
          vendorName: submission.vendor_name,
          jobDescription: submission.job_description,
        }),
        created_at: submission.created_at,
      },
    });

    // Tidak ada status change notifications karena semua pending
  }

  console.log("   ✓ Sample notifications berhasil dibuat");
  console.log("✅ Seeding selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
