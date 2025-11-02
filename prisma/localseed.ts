import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("🧹 Membersihkan database sebelum seeding...");
  
  try {
    await prisma.notificationRead.deleteMany({});
    console.log("   ✓ Semua data notification reads dihapus");
    
    await prisma.notification.deleteMany({});
    console.log("   ✓ Semua data notifications dihapus");
    
    await prisma.qrScan.deleteMany({});
    console.log("   ✓ Semua data QR scans dihapus");
    
    await prisma.supportDocument.deleteMany({});
    console.log("   ✓ Semua data support documents dihapus");
    
    await prisma.workerList.deleteMany({});
    console.log("   ✓ Semua data worker list dihapus");
    
    await prisma.submission.deleteMany({});
    console.log("   ✓ Semua data submission dihapus");
    
    await prisma.refreshToken.deleteMany({});
    console.log("   ✓ Semua data refresh tokens dihapus");
    
    await prisma.session.deleteMany({});
    console.log("   ✓ Semua data sessions dihapus");
    
    await prisma.user.deleteMany({});
    console.log("   ✓ Semua data user dihapus");
    
    console.log("🧹 Database berhasil dibersihkan");
  } catch (error) {
    console.error("❌ Error saat membersihkan database:", error);
    throw error;
  }
}

async function main() {
  await cleanDatabase();

  console.log("🌱 Memulai proses seeding...");
  console.log("");
  
  // Predefined passwords for each user
  const passwords = {
    superAdmin: "user123",
    reviewer:   "user123",
    approver:   "user123",
    verifier:   "user123",
    vendor:     "user123",
    visitor:    "user123",
    thantri:    "user123",
    julianto:   "user123",
    eja:        "user123",
  };
  
  const users = [
    {
      officer_name: "Default Super Admin",
      email: "default-super_admin@c2corpsec.com",
      password: passwords.superAdmin,
      role: "SUPER_ADMIN" as const,
      profile_photo: null,
      address: "Jakarta, Indonesia",
      phone_number: "081234567801",
      vendor_name: null,
      verified_at: new Date(),
      verified_by: "SYSTEM",
      isActive: true,
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Default Reviewer",
      email: "default-reviewer@c2corpsec.com",
      password: passwords.reviewer,
      role: "REVIEWER" as const,
      profile_photo: null,
      address: "Jakarta, Indonesia",
      phone_number: "0000000",
      vendor_name: null,
      verified_at: new Date(),
      verified_by: "SYSTEM",
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Default Approver",
      email: "default-approver@c2corpsec.com",
      password: passwords.approver,
      role: "APPROVER" as const,
      profile_photo: null,
      address: "Jakarta, Indonesia",
      phone_number: "0000000",
      vendor_name: null,
      position: "-",
      verified_at: new Date(),
      verified_by: "SYSTEM",
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Default Verifier",
      email: "default-verifier@c2corpsec.com",
      password: passwords.verifier,
      role: "VERIFIER" as const,
      profile_photo: null,
      address: "Jakarta, Indonesia",
      phone_number: "0000000",
      vendor_name: null,
      verified_at: new Date(),
      verified_by: "SYSTEM",
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Default Vendor",
      email: "default-vendor@c2corpsec.com",
      password: passwords.vendor,
      role: "VENDOR" as const,
      profile_photo: null,
      address: "Jakarta, Indonesia",
      phone_number: "0000000",
      vendor_name: "PT. Default Vendor Services",
      verified_at: new Date(),
      verified_by: "SYSTEM",
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Default Visitor",
      email: "default-visitor@c2corpsec.com",
      password: passwords.visitor,
      role: "VISITOR" as const,
      profile_photo: null,
      address: "Jakarta, Indonesia",
      phone_number: "0000000",
      vendor_name: null,
      verified_at: new Date(),
      verified_by: "SYSTEM",
      verification_status: "VERIFIED" as const,
    },

    // User tambahan - 3 users
    {
      officer_name: "Thantri",
      email: "thantri@c2corpsec.com",
      password: passwords.thantri,
      role: "REVIEWER" as const,
      profile_photo: null,
      address: "Jakarta, Indonesia",
      phone_number: "0000000",
      vendor_name: null,
      verified_at: new Date(),
      verified_by: "SYSTEM",
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Julianto",
      email: "julianto@c2corpsec.com",
      password: passwords.julianto,
      role: "APPROVER" as const,
      profile_photo: null,
      address: "Jakarta, Indonesia",
      phone_number: "0000000",
      vendor_name: null,
      position: "Sr Officer III Security",
      verified_at: new Date(),
      verified_by: "SYSTEM",
      verification_status: "VERIFIED" as const,
    },
    {
      officer_name: "Eja",
      email: "eja@c2corpsec.com",
      password: passwords.eja,
      role: "SUPER_ADMIN" as const,
      profile_photo: null,
      address: "Jakarta, Indonesia",
      phone_number: "0000000",
      vendor_name: null,
      verified_at: new Date(),
      verified_by: "SYSTEM",
      isActive: true,
      verification_status: "VERIFIED" as const,
    },
  ];

  console.log("👥 Membuat default users...");
  console.log("");
  console.log("🔐 Kredensial Login:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.create({
      data: {
        officer_name: user.officer_name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        profile_photo: user.profile_photo,
        address: user.address,
        phone_number: user.phone_number,
        vendor_name: user.vendor_name,
        position: 'position' in user ? user.position : null,
        verified_at: user.verified_at,
        verified_by: user.verified_by,
        verification_status: user.verification_status,
        isActive: 'isActive' in user ? user.isActive : true,
        created_at: new Date(),
      },
    });

    // Display credentials
    console.log(`${user.role}:`);
    console.log(`  Email    : ${user.email}`);
    console.log(`  Password : ${user.password}`);
    console.log("");
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("✅ Seeding selesai dengan sukses!");
  console.log("");
  console.log("📊 Ringkasan:");
  console.log(`   👥 ${users.length} default users berhasil dibuat`);
  console.log(`   🔑 Setiap user menggunakan password yang sudah ditentukan`);
  console.log(`   ✓ Semua user sudah terverifikasi dan aktif`);
  console.log("");
  console.log("⚠️  PENTING: Password sudah ditetapkan secara fixed untuk setiap user!");
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
