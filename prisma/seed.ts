import { PrismaClient, Role } from "@prisma/client";
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
      role: Role.ADMIN,
      profile_photo: null,
      address: "Jl. Admin No. 1, Jakarta",
      phone_number: "081234567890",
      vendor_name: null, // kosong untuk admin
      verified_at: new Date(), // admin sudah terverifikasi
      verified_by: "SYSTEM",
    },
    {
      officer_name: "Verifier Utama",
      email: "verifier@example.com",
      password: "verifier123",
      role: Role.VERIFIER,
      profile_photo: null,
      address: "Jl. Verifier No. 2, Jakarta",
      phone_number: "081234567891",
      vendor_name: null, // kosong untuk verifier
      verified_at: new Date(), // verifier sudah terverifikasi
      verified_by: "ADMIN",
    },
    {
      officer_name: "Vendor A Petugas",
      email: "vendora@example.com",
      password: "vendor123",
      role: Role.VENDOR,
      profile_photo: null,
      address: "Jl. Vendor A No. 3, Jakarta",
      phone_number: "081234567892",
      vendor_name: "PT. AHMAD VENDOR SERVICES",
      verified_at: new Date(),
      verified_by: "ADMIN",
    },
    {
      officer_name: "Vendor B Petugas",
      email: "vendorb@example.com",
      password: "vendor123",
      role: Role.VENDOR,
      profile_photo: null,
      address: "Jl. Vendor B No. 4, Bandung",
      phone_number: "081234567893",
      vendor_name: "PT. BUANA KONSTRUKSI",
      verified_at: new Date(),
      verified_by: "ADMIN",
    },
    {
      officer_name: "Vendor C Petugas",
      email: "vendorc@example.com",
      password: "vendor123",
      role: Role.VENDOR,
      profile_photo: null,
      address: "Jl. Vendor C No. 5, Surabaya",
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
  const admin = createdUsers["admin@example.com"];
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

  const statuses = ['PENDING', 'APPROVED', 'REJECTED'];
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
      
      const status = statuses[submissionCount % 3];
      
      // Create date variations
      const createdDate = new Date(currentDate);
      createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 60)); // Random date within last 60 days
      
      const submissionData: any = {
        vendor_name: vendorData.vendor_name,
        based_on: `${template.based_on.split('No.')[0]}No. ${template.based_on.split('/')[1]}/2024/${String(submissionCount + 1).padStart(3, '0')}`,
        officer_name: vendorData.officer_name,
        job_description: template.job_description,
        work_location: template.work_location,
        implementation: null, // akan diisi admin saat approve
        working_hours: template.working_hours,
        other_notes: null, // akan diisi admin saat approve
        work_facilities: template.work_facilities,
        worker_names: template.worker_names,
        content: null, // akan diisi admin saat approve
        user_id: vendorData.id,
        approval_status: status,
        qrcode: `QR-${vendorData.id}-${Date.now()}-${submissionCount}`,
        created_at: createdDate,
        simja_number: submissionCount % 2 === 0 ? `SIMJA/2024/${String(submissionCount + 1).padStart(3, '0')}` : null,
        simja_date: submissionCount % 2 === 0 ? new Date(createdDate.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null,
        sika_number: submissionCount % 3 === 0 ? `SIKA/2024/${String(submissionCount + 1).padStart(3, '0')}` : null,
        sika_date: submissionCount % 3 === 0 ? new Date(createdDate.getTime() - Math.random() * 15 * 24 * 60 * 60 * 1000) : null,
      };

      // Add approval data for approved/rejected submissions
      if (status === 'APPROVED') {
        submissionData.approved_by = admin.id;
        submissionData.simlok_number = `SIMLOK/2024/${String(submissionCount + 1).padStart(3, '0')}`;
        submissionData.simlok_date = new Date(createdDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000);
        submissionData.notes = 'Pengajuan disetujui dengan catatan mengikuti prosedur K3 dan laporan harian';
        // Admin mengisi implementation, other_notes, dan content saat approve
        submissionData.implementation = `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} s/d 2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
        const otherNotesOptions = [
          'Koordinasi dengan supervisor produksi',
          'Bekerja di luar jam operasional kantor',
          'Memerlukan izin kerja tinggi',
          'Pekerjaan malam hari untuk minimal downtime',
          'Pekerjaan shift malam',
          'Memerlukan koordinasi dengan penghuni gedung',
          'Pekerjaan sebelum jam operasional mall',
          'Koordinasi dengan traffic management'
        ];
        submissionData.other_notes = otherNotesOptions[submissionCount % otherNotesOptions.length];
        
        // Admin mengisi content saat approve
        const contentOptions = [
          'Pemeliharaan rutin mesin produksi untuk memastikan kinerja optimal',
          'Pemasangan sistem CCTV dan alarm keamanan di seluruh area kantor',
          'Perbaikan struktur gudang dan peningkatan kapasitas penyimpanan',
          'Update sistem dan maintenance server untuk performa optimal',
          'Layanan kebersihan harian untuk seluruh area perkantoran',
          'Pengecatan ulang eksterior dan interior gedung perkantoran',
          'Pemasangan sistem AC central untuk seluruh area mall',
          'Perbaikan dan penambalan jalan akses menuju area industri'
        ];
        submissionData.content = contentOptions[submissionCount % contentOptions.length];
      } else if (status === 'REJECTED') {
        submissionData.approved_by = admin.id;
        const rejectionReasons = [
          'Dokumen SIMJA belum lengkap, mohon dilengkapi terlebih dahulu',
          'Sertifikat pelatihan K3 sudah expired, mohon diperbaharui',
          'Jadwal pelaksanaan bertabrakan dengan kegiatan lain',
          'Spesifikasi alat kerja tidak sesuai standar, mohon disesuaikan',
          'Jumlah pekerja kurang memadai untuk scope pekerjaan ini'
        ];
        submissionData.notes = rejectionReasons[submissionCount % rejectionReasons.length];
      }

      const createdSubmission = await prisma.submission.create({
        data: submissionData,
      });

      // Create worker list for this submission
      const workerNamesArray = template.worker_names.split('\n');
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
        message: `Pengajuan baru dari ${submission.user.vendor_name}: ${submission.job_description}`,
        data: JSON.stringify({
          submissionId: submission.id,
          vendorName: submission.user.vendor_name,
          jobDescription: submission.job_description,
        }),
        created_at: submission.created_at,
      },
    });

    // Create vendor notification for status changes (for approved/rejected submissions)
    if (submission.approval_status !== 'PENDING') {
      await prisma.notification.create({
        data: {
          scope: 'vendor',
          vendor_id: submission.user_id,
          type: 'status_change',
          title: 'Status Pengajuan Diperbarui',
          message: `Pengajuan Anda "${submission.job_description}" telah ${submission.approval_status === 'APPROVED' ? 'disetujui' : 'ditolak'}`,
          data: JSON.stringify({
            submissionId: submission.id,
            newStatus: submission.approval_status,
            jobDescription: submission.job_description,
          }),
          created_at: new Date(submission.created_at.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000), // 1-2 hari setelah submission
        },
      });
    }
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
