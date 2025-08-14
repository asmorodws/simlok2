// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { csrfToken, firstName, lastName, email, password, role } = await req.json();

    // Ambil cookie CSRF yang dikirim oleh browser
    const cookieHeader = req.headers.get("cookie") || "";
    const csrfCookie = cookieHeader
      .split("; ")
      .find((c) => c.startsWith("__Host-next-auth.csrf-token=") || c.startsWith("next-auth.csrf-token="));

    if (!csrfCookie) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    // Format cookie: token|hash
    const [expected] = csrfCookie.split("=")[1].split("%7C"); // %7C = |
    if (!expected || csrfToken !== expected) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    /* sisanya sama seperti sebelumnya */
    if (!firstName || !lastName || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await prisma.user.create({
      data: {
        nama_petugas: `${firstName} ${lastName}`.trim(),
        email,
        password: hashedPassword,
        role,
      },
    });

    return NextResponse.json(
      { message: "User registered successfully", user: { id: newUser.id, nama_petugas: newUser.nama_petugas, email: newUser.email, role: newUser.role } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}