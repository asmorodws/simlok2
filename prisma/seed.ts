import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      nama_petugas: "Admin Utama",
      email: "admin@example.com",
      password: "admin123",
      role: Role.ADMIN,
      foto_profil: null,
      alamat: "Jl. Admin No. 1, Jakarta",
      no_telp: "081234567890",
      nama_vendor: null, // kosong untuk admin
      verified_at: new Date(), // admin sudah terverifikasi
      verified_by: "SYSTEM",
    },
    {
      nama_petugas: "Verifier Utama",
      email: "verifier@example.com",
      password: "verifier123",
      role: Role.VERIFIER,
      foto_profil: null,
      alamat: "Jl. Verifier No. 2, Jakarta",
      no_telp: "081234567891",
      nama_vendor: null, // kosong untuk verifier
      verified_at: new Date(), // verifier sudah terverifikasi
      verified_by: "ADMIN",
    },
    {
      nama_petugas: "Verifier Kedua",
      email: "verifier2@example.com",
      password: "verifier123",
      role: Role.VERIFIER,
      foto_profil: null,
      alamat: "Jl. Verifier No. 3, Bandung",
      no_telp: "081234567899",
      nama_vendor: null, // kosong untuk verifier
      verified_at: new Date(), // verifier sudah terverifikasi
      verified_by: "ADMIN",
    },
    // 20 Vendor Dummy Data
    {
      nama_petugas: "Budi Santoso",
      email: "budi@vendor1.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Mangga No. 1, Jakarta Selatan",
      no_telp: "081234567801",
      nama_vendor: "CV Budi Jaya",
      verified_at: new Date(),
      verified_by: "Verifier Utama",
    },
    {
      nama_petugas: "Siti Rahayu",
      email: "siti@vendor2.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Jeruk No. 15, Bandung",
      no_telp: "081234567802",
      nama_vendor: "PT Siti Makmur",
      verified_at: null,
      verified_by: null,
    },
    {
      nama_petugas: "Ahmad Fauzi",
      email: "ahmad@vendor3.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Apel No. 7, Surabaya",
      no_telp: "081234567803",
      nama_vendor: "UD Ahmad Sejahtera",
      verified_at: new Date(),
      verified_by: "Verifier Kedua",
    },
    {
      nama_petugas: "Dewi Lestari",
      email: "dewi@vendor4.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Melati No. 12, Yogyakarta",
      no_telp: "081234567804",
      nama_vendor: "CV Dewi Indah",
      verified_at: new Date(),
      verified_by: "Verifier Utama",
    },
    {
      nama_petugas: "Eko Prasetyo",
      email: "eko@vendor5.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Mawar No. 5, Semarang",
      no_telp: "081234567805",
      nama_vendor: "PT Eko Global",
      verified_at: null,
      verified_by: null,
    },
    {
      nama_petugas: "Rina Susanti",
      email: "rina@vendor6.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Anggrek No. 8, Medan",
      no_telp: "081234567806",
      nama_vendor: "CV Rina Mandiri",
      verified_at: new Date(),
      verified_by: "Verifier Kedua",
    },
    {
      nama_petugas: "Joko Widodo",
      email: "joko@vendor7.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Kenanga No. 3, Solo",
      no_telp: "081234567807",
      nama_vendor: "UD Joko Sukses",
      verified_at: new Date(),
      verified_by: "Verifier Utama",
    },
    {
      nama_petugas: "Maya Sari",
      email: "maya@vendor8.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Tulip No. 20, Malang",
      no_telp: "081234567808",
      nama_vendor: "PT Maya Berkah",
      verified_at: null,
      verified_by: null,
    },
    {
      nama_petugas: "Rudi Hartono",
      email: "rudi@vendor9.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Dahlia No. 11, Palembang",
      no_telp: "081234567809",
      nama_vendor: "CV Rudi Abadi",
      verified_at: new Date(),
      verified_by: "Verifier Kedua",
    },
    {
      nama_petugas: "Lina Marlina",
      email: "lina@vendor10.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Cempaka No. 6, Makassar",
      no_telp: "081234567810",
      nama_vendor: "UD Lina Jaya",
      verified_at: new Date(),
      verified_by: "Verifier Utama",
    },
    {
      nama_petugas: "Hendra Wijaya",
      email: "hendra@vendor11.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Sakura No. 14, Denpasar",
      no_telp: "081234567811",
      nama_vendor: "PT Hendra Prima",
      verified_at: null,
      verified_by: null,
    },
    {
      nama_petugas: "Putri Ayu",
      email: "putri@vendor12.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Flamboyan No. 9, Balikpapan",
      no_telp: "081234567812",
      nama_vendor: "CV Putri Cemerlang",
      verified_at: new Date(),
      verified_by: "Verifier Kedua",
    },
    {
      nama_petugas: "Wahyu Nugroho",
      email: "wahyu@vendor13.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Bougenville No. 18, Pontianak",
      no_telp: "081234567813",
      nama_vendor: "UD Wahyu Maju",
      verified_at: new Date(),
      verified_by: "Verifier Utama",
    },
    {
      nama_petugas: "Indira Sari",
      email: "indira@vendor14.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Kamboja No. 2, Pekanbaru",
      no_telp: "081234567814",
      nama_vendor: "PT Indira Sejati",
      verified_at: null,
      verified_by: null,
    },
    {
      nama_petugas: "Bambang Sutrisno",
      email: "bambang@vendor15.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Teratai No. 16, Jambi",
      no_telp: "081234567815",
      nama_vendor: "CV Bambang Makmur",
      verified_at: new Date(),
      verified_by: "Verifier Kedua",
    },
    {
      nama_petugas: "Tri Wulandari",
      email: "tri@vendor16.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Gardenia No. 4, Padang",
      no_telp: "081234567816",
      nama_vendor: "UD Tri Sukses",
      verified_at: new Date(),
      verified_by: "Verifier Utama",
    },
    {
      nama_petugas: "Fajar Nugraha",
      email: "fajar@vendor17.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Lavender No. 13, Banjarmasin",
      no_telp: "081234567817",
      nama_vendor: "PT Fajar Gemilang",
      verified_at: null,
      verified_by: null,
    },
    {
      nama_petugas: "Sari Dewi",
      email: "sari@vendor18.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Peony No. 10, Manado",
      no_telp: "081234567818",
      nama_vendor: "CV Sari Utama",
      verified_at: new Date(),
      verified_by: "Verifier Kedua",
    },
    {
      nama_petugas: "Agus Setiawan",
      email: "agus@vendor19.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Iris No. 17, Banda Aceh",
      no_telp: "081234567819",
      nama_vendor: "UD Agus Berkah",
      verified_at: new Date(),
      verified_by: "Verifier Utama",
    },
    {
      nama_petugas: "Mega Putri",
      email: "mega@vendor20.com",
      password: "vendor123",
      role: Role.VENDOR,
      foto_profil: null,
      alamat: "Jl. Violet No. 19, Jayapura",
      no_telp: "081234567820",
      nama_vendor: "PT Mega Sukses",
      verified_at: null,
      verified_by: null,
    },
  ];

  const createdUsers: { [key: string]: any } = {};

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {}, // tidak update kalau sudah ada
      create: {
        nama_petugas: user.nama_petugas,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        foto_profil: user.foto_profil,
        alamat: user.alamat,
        no_telp: user.no_telp,
        nama_vendor: user.nama_vendor,
        verified_at: user.verified_at,
        verified_by: user.verified_by,
      },
    });

    createdUsers[user.email] = createdUser;
  }

  // Create sample submissions
  const admin = createdUsers["admin@example.com"];
  const vendorUsers = Object.values(createdUsers).filter((user: any) => user.role === 'VENDOR');

  const submissionTemplates = [
    {
      berdasarkan: "Kontrak Kerja No. KK/2024/001",
      pekerjaan: "Maintenance Mesin Produksi",
      lokasi_kerja: "Pabrik Jakarta Plant 1",
      pelaksanaan: "2024-01-15 s/d 2024-01-20",
      jam_kerja: "08:00 - 17:00 WIB",
      sarana_kerja: "Toolkit lengkap, APD standar, crane mobile",
      nama_pekerja: "Tim Maintenance (5 orang)",
      lain_lain: "Koordinasi dengan supervisor produksi",
      content: "Pemeliharaan rutin mesin produksi untuk memastikan kinerja optimal",
    },
    {
      berdasarkan: "SPK No. SPK/2024/002",
      pekerjaan: "Instalasi Sistem Keamanan",
      lokasi_kerja: "Gedung Kantor Pusat",
      pelaksanaan: "2024-01-22 s/d 2024-01-25",
      jam_kerja: "09:00 - 16:00 WIB",
      sarana_kerja: "Kamera CCTV, kabel, tools instalasi",
      nama_pekerja: "Teknisi CCTV (3 orang)",
      lain_lain: "Bekerja di luar jam operasional kantor",
      content: "Pemasangan sistem CCTV dan alarm keamanan di seluruh area kantor",
    },
    {
      berdasarkan: "Kontrak Pembangunan No. KB/2024/003",
      pekerjaan: "Renovasi Gudang",
      lokasi_kerja: "Gudang Distribusi Bandung",
      pelaksanaan: "2024-02-01 s/d 2024-02-15",
      jam_kerja: "07:00 - 16:00 WIB",
      sarana_kerja: "Alat berat, material bangunan, scaffolding",
      nama_pekerja: "Tim Konstruksi (10 orang)",
      lain_lain: "Memerlukan izin kerja tinggi",
      content: "Perbaikan struktur gudang dan peningkatan kapasitas penyimpanan",
    },
    {
      berdasarkan: "Work Order No. WO/2024/004",
      pekerjaan: "Pemeliharaan Jaringan IT",
      lokasi_kerja: "Data Center Jakarta",
      pelaksanaan: "2024-02-10 s/d 2024-02-12",
      jam_kerja: "20:00 - 05:00 WIB",
      sarana_kerja: "Server equipment, testing tools, laptop",
      nama_pekerja: "IT Specialist (2 orang)",
      lain_lain: "Pekerjaan malam hari untuk minimal downtime",
      content: "Update sistem dan maintenance server untuk performa optimal",
    },
    {
      berdasarkan: "Kontrak Layanan No. KL/2024/005",
      pekerjaan: "Cleaning Service",
      lokasi_kerja: "Komplek Perkantoran",
      pelaksanaan: "2024-02-01 s/d 2024-02-29",
      jam_kerja: "18:00 - 06:00 WIB",
      sarana_kerja: "Peralatan cleaning, chemical, vacuum cleaner",
      nama_pekerja: "Cleaning Staff (8 orang)",
      lain_lain: "Pekerjaan shift malam",
      content: "Layanan kebersihan harian untuk seluruh area perkantoran",
    },
    {
      berdasarkan: "SPK No. SPK/2024/006",
      pekerjaan: "Pengecatan Gedung",
      lokasi_kerja: "Gedung Perkantoran Tower A",
      pelaksanaan: "2024-02-20 s/d 2024-03-05",
      jam_kerja: "08:00 - 15:00 WIB",
      sarana_kerja: "Cat, kuas, roller, scaffolding, drop cloth",
      nama_pekerja: "Tim Pengecatan (6 orang)",
      lain_lain: "Memerlukan koordinasi dengan penghuni gedung",
      content: "Pengecatan ulang eksterior dan interior gedung perkantoran",
    },
    {
      berdasarkan: "Kontrak Kerja No. KK/2024/007",
      pekerjaan: "Instalasi AC Central",
      lokasi_kerja: "Mall Jakarta Timur",
      pelaksanaan: "2024-03-01 s/d 2024-03-20",
      jam_kerja: "06:00 - 14:00 WIB",
      sarana_kerja: "Unit AC, ducting, tools HVAC, crane",
      nama_pekerja: "Teknisi HVAC (8 orang)",
      lain_lain: "Pekerjaan sebelum jam operasional mall",
      content: "Pemasangan sistem AC central untuk seluruh area mall",
    },
    {
      berdasarkan: "Work Order No. WO/2024/008",
      pekerjaan: "Perbaikan Jalan Akses",
      lokasi_kerja: "Area Industri Cikarang",
      pelaksanaan: "2024-03-10 s/d 2024-03-25",
      jam_kerja: "07:00 - 17:00 WIB",
      sarana_kerja: "Aspal, alat berat, roller, marka jalan",
      nama_pekerja: "Tim Konstruksi Jalan (12 orang)",
      lain_lain: "Koordinasi dengan traffic management",
      content: "Perbaikan dan penambalan jalan akses menuju area industri",
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
        pelaksanaan: template.pelaksanaan,
        jam_kerja: template.jam_kerja,
        lain_lain: template.lain_lain,
        sarana_kerja: template.sarana_kerja,
        nama_pekerja: template.nama_pekerja,
        content: template.content,
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
        submissionData.tembusan = `Tembusan kepada: Manager Operasional, HSE Coordinator, Security - ${vendorData.nama_vendor}`;
        submissionData.keterangan = 'Pengajuan disetujui dengan catatan mengikuti prosedur K3 dan laporan harian';
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

  console.log("✅ Seeding selesai");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
