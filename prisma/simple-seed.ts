import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai simple seeding (users only)...");
  
  const users = [
    {
      nama_petugas: "Admin Utama",
      email: "admin@example.com",
      password: "admin123",
      role: Role.ADMIN,
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
      alamat: "Jl. Verifier No. 2, Jakarta",
      no_telp: "081234567891",
      nama_vendor: null, // kosong untuk verifier
      verified_at: new Date(), // verifier sudah terverifikasi
      verified_by: "ADMIN",
    },
    {
      nama_petugas: "John Doe",
      email: "vendor1@example.com",
      password: "vendor123",
      role: Role.VENDOR,
      alamat: "Jl. Vendor 1 No. 3, Jakarta",
      no_telp: "081234567892",
      nama_vendor: "PT. Vendor Satu",
      verified_at: new Date(), // vendor sudah terverifikasi
      verified_by: "ADMIN",
    },
    {
      nama_petugas: "Jane Smith",
      email: "vendor2@example.com",
      password: "vendor123",
      role: Role.VENDOR,
      alamat: "Jl. Vendor 2 No. 4, Jakarta",
      no_telp: "081234567893",
      nama_vendor: "CV. Vendor Dua",
      verified_at: new Date(), // vendor sudah terverifikasi
      verified_by: "ADMIN",
    },
    {
      nama_petugas: "Bob Wilson",
      email: "vendor3@example.com",
      password: "vendor123",
      role: Role.VENDOR,
      alamat: "Jl. Vendor 3 No. 5, Jakarta",
      no_telp: "081234567894",
      nama_vendor: "PT. Vendor Tiga",
      verified_at: null, // vendor belum terverifikasi
      verified_by: null,
    },
  ];

  console.log("👥 Membuat users...");
  let userCount = 0;

  for (const user of users) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);

      const createdUser = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          // Update existing user data
          nama_petugas: user.nama_petugas,
          password: hashedPassword,
          role: user.role,
          alamat: user.alamat,
          no_telp: user.no_telp,
          nama_vendor: user.nama_vendor,
          verified_at: user.verified_at,
          verified_by: user.verified_by,
        },
        create: {
          nama_petugas: user.nama_petugas,
          email: user.email,
          password: hashedPassword,
          role: user.role,
          alamat: user.alamat,
          no_telp: user.no_telp,
          nama_vendor: user.nama_vendor,
          verified_at: user.verified_at,
          verified_by: user.verified_by,
        },
      });

      console.log(`   ✓ User ${user.role.toLowerCase()}: ${user.email}`);
      userCount++;
    } catch (error) {
      console.error(`   ❌ Error creating user ${user.email}:`, error);
    }
  }

  console.log(`\n✅ Simple seeding selesai! ${userCount} users berhasil dibuat.`);
  
  console.log("\n🔐 Login credentials:");
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│ Role      │ Email                 │ Password   │ Status   │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log("│ Admin     │ admin@example.com     │ admin123   │ Verified │");
  console.log("│ Verifier  │ verifier@example.com  │ verifier123│ Verified │");
  console.log("│ Vendor 1  │ vendor1@example.com   │ vendor123  │ Verified │");
  console.log("│ Vendor 2  │ vendor2@example.com   │ vendor123  │ Verified │");
  console.log("│ Vendor 3  │ vendor3@example.com   │ vendor123  │ Pending  │");
  console.log("└─────────────────────────────────────────────────────────┘");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
