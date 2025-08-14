import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      name: "Vendor User",
      email: "vendor@example.com",
      password: "vendor123",
      role: Role.VENDOR,
    },
    {
      name: "Verifier User",
      email: "verifier@example.com",
      password: "verifier123",
      role: Role.VERIFIER,
    },
    {
      name: "Admin User",
      email: "admin@example.com",
      password: "admin123",
      role: Role.ADMIN,
    },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {}, // tidak update kalau sudah ada
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
      },
    });
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
