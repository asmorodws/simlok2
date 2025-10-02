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
        other_notes: null, // akan diisi setelah diapprove
        work_facilities: template.work_facilities,
        worker_names: template.worker_names,
        worker_count: workerCount, // Hitung dari worker_names
        content: null, // akan diisi setelah diapprove
        user_id: vendorData.id,
        approval_status: 'PENDING', // Semua submission pending approval
        review_status: "PENDING_REVIEW", // Semua pending review dari reviewer
        final_status: "PENDING_APPROVAL", // Semua pending final approval dari approver
        review_note: null, // belum ada review
        final_note: null, // belum ada final note
        reviewed_by_id: null, // belum di-review
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

  // All submissions remain PENDING for review and final approval
  console.log("📋 Semua submissions dibuat dengan status PENDING_REVIEW dan PENDING_APPROVAL");
  console.log("   ✓ Reviewer dapat melakukan review submissions");
  console.log("   ✓ Approver dapat melakukan final approval setelah review");
  console.log("   ✓ QR codes akan dibuat setelah approval final");

  console.log("🔔 Tidak membuat notification seed data");
  console.log("");
  console.log("✅ Seeding selesai dengan sukses!");
  console.log("");
  console.log("📊 Ringkasan data yang dibuat:");
  console.log(`   👥 ${Object.keys(createdUsers).length} users (termasuk super admin, reviewer, approver, verifier, vendor)`);
  console.log(`   📋 ${submissionCount} submissions (semua dengan status PENDING_REVIEW & PENDING_APPROVAL)`);
  console.log("");
  console.log("🎯 Workflow yang dapat ditest:");
  console.log("   1. Login sebagai Reviewer untuk melakukan review submissions");
  console.log("   2. Login sebagai Approver untuk melakukan final approval");
  console.log("   3. Login sebagai Verifier untuk melakukan QR scan (setelah approval)");
  console.log("   4. Login sebagai Vendor untuk melihat status submissions");
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
