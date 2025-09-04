import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("🧹 Membersihkan database sebelum seeding...");
  
  try {
    // Hapus data dengan urutan yang benar (child tables dulu, lalu parent tables)
    // Karena submission menggunakan foreign key ke user, hapus submission dulu
    await prisma.submission.deleteMany({});
    console.log("   ✓ Semua data submission dihapus");
    
    // Lalu hapus users
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
      officer_name: "Vendor A",
      email: "vendora@example.com",
      password: "vendor123",
      role: Role.VENDOR,
      profile_photo: null,
      address: "Jl. Vendor A No. 3, Jakarta",
      phone_number: "081234567892",
      vendor_name: "Vendor A",
      verified_at: new Date(), // vendor sudah terverifikasi
      verified_by: "ADMIN",}
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
      berdasarkan: "Kontrak Kerja No. KK/2024/001",
      pekerjaan: "Maintenance Mesin Produksi",
      lokasi_kerja: "Pabrik Jakarta Plant 1",
      jam_kerja: "08:00 - 17:00 WIB",
      sarana_kerja: "Toolkit lengkap, APD standar, crane mobile",
      nama_pekerja: "Tim Maintenance (5 orang)",
    },
    {
      berdasarkan: "SPK No. SPK/2024/002",
      pekerjaan: "Instalasi Sistem Keamanan",
      lokasi_kerja: "Gedung Kantor Pusat",
      jam_kerja: "09:00 - 16:00 WIB",
      sarana_kerja: "Kamera CCTV, kabel, tools instalasi",
      nama_pekerja: "Teknisi CCTV (3 orang)",
    },
    {
      berdasarkan: "Kontrak Pembangunan No. KB/2024/003",
      pekerjaan: "Renovasi Gudang",
      lokasi_kerja: "Gudang Distribusi Bandung",
      jam_kerja: "07:00 - 16:00 WIB",
      sarana_kerja: "Alat berat, material bangunan, scaffolding",
      nama_pekerja: "Tim Konstruksi (10 orang)",
    },
    {
      berdasarkan: "Work Order No. WO/2024/004",
      pekerjaan: "Pemeliharaan Jaringan IT",
      lokasi_kerja: "Data Center Jakarta",
      jam_kerja: "20:00 - 05:00 WIB",
      sarana_kerja: "Server equipment, testing tools, laptop",
      nama_pekerja: "IT Specialist (2 orang)",
    },
    {
      berdasarkan: "Kontrak Layanan No. KL/2024/005",
      pekerjaan: "Cleaning Service",
      lokasi_kerja: "Komplek Perkantoran",
      jam_kerja: "18:00 - 06:00 WIB",
      sarana_kerja: "Peralatan cleaning, chemical, vacuum cleaner",
      nama_pekerja: "Cleaning Staff (8 orang)",
    },
    {
      berdasarkan: "SPK No. SPK/2024/006",
      pekerjaan: "Pengecatan Gedung",
      lokasi_kerja: "Gedung Perkantoran Tower A",
      jam_kerja: "08:00 - 15:00 WIB",
      sarana_kerja: "Cat, kuas, roller, scaffolding, drop cloth",
      nama_pekerja: "Tim Pengecatan (6 orang)",
    },
    {
      berdasarkan: "Kontrak Kerja No. KK/2024/007",
      pekerjaan: "Instalasi AC Central",
      lokasi_kerja: "Mall Jakarta Timur",
      jam_kerja: "06:00 - 14:00 WIB",
      sarana_kerja: "Unit AC, ducting, tools HVAC, crane",
      nama_pekerja: "Teknisi HVAC (8 orang)",
    },
    {
      berdasarkan: "Work Order No. WO/2024/008",
      pekerjaan: "Perbaikan Jalan Akses",
      lokasi_kerja: "Area Industri Cikarang",
      jam_kerja: "07:00 - 17:00 WIB",
      sarana_kerja: "Aspal, alat berat, roller, marka jalan",
      nama_pekerja: "Tim Konstruksi Jalan (12 orang)",
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
        nama_vendor: vendorData.nama_vendor,
        berdasarkan: `${template.berdasarkan.split('No.')[0]}No. ${template.berdasarkan.split('/')[1]}/2024/${String(submissionCount + 1).padStart(3, '0')}`,
        nama_petugas: vendorData.nama_petugas,
        pekerjaan: template.pekerjaan,
        lokasi_kerja: template.lokasi_kerja,
        pelaksanaan: null, // akan diisi admin saat approve
        jam_kerja: template.jam_kerja,
        lain_lain: null, // akan diisi admin saat approve
        sarana_kerja: template.sarana_kerja,
        nama_pekerja: template.nama_pekerja,
        content: null, // akan diisi admin saat approve
        userId: vendorData.id,
        status_approval_admin: status,
        qrcode: `QR-${vendorData.id}-${Date.now()}-${submissionCount}`,
        created_at: createdDate,
        nomor_simja: submissionCount % 2 === 0 ? `SIMJA/2024/${String(submissionCount + 1).padStart(3, '0')}` : null,
        tanggal_simja: submissionCount % 2 === 0 ? new Date(createdDate.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null,
        nomor_sika: submissionCount % 3 === 0 ? `SIKA/2024/${String(submissionCount + 1).padStart(3, '0')}` : null,
        tanggal_sika: submissionCount % 3 === 0 ? new Date(createdDate.getTime() - Math.random() * 15 * 24 * 60 * 60 * 1000) : null,
      };

      // Add approval data for approved/rejected submissions
      if (status === 'APPROVED') {
        submissionData.approved_by_admin = admin.id;
        submissionData.nomor_simlok = `SIMLOK/2024/${String(submissionCount + 1).padStart(3, '0')}`;
        submissionData.tanggal_simlok = new Date(createdDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000);
        // submissionData.tembusan = `Tembusan kepada: Manager Operasional, HSE Coordinator, Security - ${vendorData.nama_vendor}`;
        submissionData.keterangan = 'Pengajuan disetujui dengan catatan mengikuti prosedur K3 dan laporan harian';
        // Admin mengisi pelaksanaan, lain_lain, dan content saat approve
        submissionData.pelaksanaan = `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} s/d 2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
        const lainLainOptions = [
          'Koordinasi dengan supervisor produksi',
          'Bekerja di luar jam operasional kantor',
          'Memerlukan izin kerja tinggi',
          'Pekerjaan malam hari untuk minimal downtime',
          'Pekerjaan shift malam',
          'Memerlukan koordinasi dengan penghuni gedung',
          'Pekerjaan sebelum jam operasional mall',
          'Koordinasi dengan traffic management'
        ];
        submissionData.lain_lain = lainLainOptions[submissionCount % lainLainOptions.length];
        
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
        submissionData.approved_by_admin = admin.id;
        const rejectionReasons = [
          'Dokumen SIMJA belum lengkap, mohon dilengkapi terlebih dahulu',
          'Sertifikat pelatihan K3 sudah expired, mohon diperbaharui',
          'Jadwal pelaksanaan bertabrakan dengan kegiatan lain',
          'Spesifikasi alat kerja tidak sesuai standar, mohon disesuaikan',
          'Jumlah pekerja kurang memadai untuk scope pekerjaan ini'
        ];
        submissionData.keterangan = rejectionReasons[submissionCount % rejectionReasons.length];
      }

      await prisma.submission.create({
        data: submissionData,
      });
      
      submissionCount++;
    }
  }

  console.log(`   ✓ ${submissionCount} submissions berhasil dibuat`);
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
