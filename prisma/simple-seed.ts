import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai simple seeding (users only)...");
  
  const users = [
    {
      officer_name: "Admin Utama",
      email: "admin@example.com",
      password: "admin123",
      role: Role.ADMIN,
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
      address: "Jl. Verifier No. 2, Jakarta",
      phone_number: "081234567891",
      vendor_name: null, // kosong untuk verifier
      verified_at: new Date(), // verifier sudah terverifikasi
      verified_by: "ADMIN",
    },
    {
      officer_name: "John Doe",
      email: "john@vendorsatu.com",
      password: "vendor123",
      role: Role.VENDOR,
      address: "Jl. Vendor Satu No. 10, Jakarta",
      phone_number: "081234567892",
      vendor_name: "PT. Vendor Satu",
      verified_at: new Date(), // vendor sudah terverifikasi
      verified_by: "ADMIN",
    },
    {
      officer_name: "Jane Smith",
      email: "jane@vendordua.com",
      password: "vendor123",
      role: Role.VENDOR,
      address: "Jl. Vendor Dua No. 20, Jakarta",
      phone_number: "081234567893",
      vendor_name: "CV. Vendor Dua",
      verified_at: new Date(), // vendor sudah terverifikasi
      verified_by: "ADMIN",
    },
    {
      officer_name: "Bob Wilson",
      email: "bob@vendortiga.com",
      password: "vendor123",
      role: Role.VENDOR,
      address: "Jl. Vendor Tiga No. 30, Jakarta",
      phone_number: "081234567894",
      vendor_name: "PT. Vendor Tiga",
      verified_at: new Date(), // vendor sudah terverifikasi
      verified_by: "ADMIN",
    },
  ];

  console.log("👥 Membuat users...");
  let userCount = 0;

  for (const user of users) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);

      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          // Update existing user data
          officer_name: user.officer_name,
          password: hashedPassword,
          role: user.role,
          address: user.address,
          phone_number: user.phone_number,
          vendor_name: user.vendor_name,
          verified_at: user.verified_at,
          verified_by: user.verified_by,
        },
        create: {
          officer_name: user.officer_name,
          email: user.email,
          password: hashedPassword,
          role: user.role,
          address: user.address,
          phone_number: user.phone_number,
          vendor_name: user.vendor_name,
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
