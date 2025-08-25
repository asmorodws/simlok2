// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Validation schema for vendor registration
const vendorRegistrationSchema = z.object({
  csrfToken: z.string().min(1, "CSRF token is required"),
  nama_petugas: z.string()
    .min(2, "Nama petugas minimal 2 karakter")
    .max(100, "Nama petugas maksimal 100 karakter")
    .trim(),
  email: z.string()
    .email("Format email tidak valid")
    .min(5, "Email terlalu pendek")
    .max(100, "Email terlalu panjang")
    .toLowerCase(),
  password: z.string()
    .min(8, "Password minimal 8 karakter")
    .max(100, "Password terlalu panjang")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password harus mengandung huruf besar, huruf kecil, dan angka"),
  nama_vendor: z.string()
    .min(2, "Nama vendor minimal 2 karakter")
    .max(150, "Nama vendor maksimal 150 karakter")
    .trim(),
  alamat: z.string()
    .min(10, "Alamat minimal 10 karakter")
    .max(500, "Alamat maksimal 500 karakter")
    .trim(),
  no_telp: z.string()
    .min(10, "Nomor telepon minimal 10 digit")
    .max(15, "Nomor telepon maksimal 15 digit")
    .regex(/^[0-9+\-\s]+$/, "Nomor telepon hanya boleh berisi angka, +, -, dan spasi")
    .trim(),
});

// Rate limiting store (in production, use Redis)
const registrationAttempts = new Map<string, { count: number; lastAttempt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5; // Maximum 5 registration attempts per 15 minutes

  const attempts = registrationAttempts.get(ip);
  
  if (!attempts) {
    registrationAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  // Reset counter if window has passed
  if (now - attempts.lastAttempt > windowMs) {
    registrationAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  // Check if limit exceeded
  if (attempts.count >= maxAttempts) {
    return false;
  }

  // Increment counter
  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

function validateCsrfToken(req: NextRequest, csrfToken: string): boolean {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const csrfCookie = cookieHeader
      .split("; ")
      .find((c) => c.startsWith("__Host-next-auth.csrf-token=") || c.startsWith("next-auth.csrf-token="));

    if (!csrfCookie) {
      return false;
    }

    // Format cookie: token|hash, URL encoded %7C = |
    const cookieValue = decodeURIComponent(csrfCookie.split("=")[1]);
    const [expectedToken] = cookieValue.split("|");
    
    return expectedToken === csrfToken;
  } catch (error) {
    console.error("CSRF validation error:", error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "127.0.0.1";

    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan pendaftaran. Silakan coba lagi dalam 15 menit." }, 
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    
    // Validate input using Zod schema
    const validationResult = vendorRegistrationSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err: any) => err.message).join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { csrfToken, nama_petugas, email, password, nama_vendor, alamat, no_telp } = validationResult.data;

    // Validate CSRF token
    if (!validateCsrfToken(req, csrfToken)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true, email: true }
    });
    
    if (existingUser) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    // Check if vendor name already exists (case-insensitive)
    const existingVendor = await prisma.user.findFirst({
      where: { 
        nama_vendor: {
          equals: nama_vendor,
        }
      },
      select: { id: true, nama_vendor: true }
    });

    if (existingVendor) {
      return NextResponse.json({ error: "Nama vendor sudah terdaftar" }, { status: 409 });
    }

    // Hash password with strong settings
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new vendor user
    const newUser = await prisma.user.create({
      data: {
        nama_petugas,
        email,
        password: hashedPassword,
        nama_vendor,
        alamat,
        no_telp,
        role: "VENDOR", // Always VENDOR for this registration endpoint
        verified_at: null, // Requires admin verification
      },
      select: {
        id: true,
        nama_petugas: true,
        email: true,
        nama_vendor: true,
        role: true,
        date_created_at: true,
        verified_at: true,
      }
    });

    // Log successful registration (for audit purposes)
    console.log(`New vendor registered: ${email} (${nama_vendor}) at ${new Date().toISOString()}`);

    return NextResponse.json(
      { 
        message: "Pendaftaran berhasil! Akun Anda sedang menunggu verifikasi admin.", 
        user: {
          id: newUser.id,
          nama_petugas: newUser.nama_petugas,
          email: newUser.email,
          nama_vendor: newUser.nama_vendor,
          role: newUser.role,
          verified: !!newUser.verified_at,
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Registration error:", error);
    
    // Don't expose internal errors to client
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server. Silakan coba lagi." }, 
      { status: 500 }
    );
  }
}