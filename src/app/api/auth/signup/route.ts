// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Validation schema for vendor registration
const vendorRegistrationSchema = z.object({
  csrfToken: z.string().min(1, "CSRF token is required"),
  officer_name: z.string()
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
  vendor_name: z.string()
    .min(2, "Nama vendor minimal 2 karakter")
    .max(150, "Nama vendor maksimal 150 karakter")
    .trim(),
  address: z.string()
    .min(10, "Alamat minimal 10 karakter")
    .max(500, "Alamat maksimal 500 karakter")
    .trim(),
  phone_number: z.string()
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
    const cookieValue = decodeURIComponent(csrfCookie.split("=")[1] || '');
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

    const { csrfToken, officer_name, email, password, vendor_name, address, phone_number } = validationResult.data;

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
        vendor_name: {
          equals: vendor_name,
        }
      },
      select: { id: true, vendor_name: true }
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
        officer_name,
        email,
        password: hashedPassword,
        vendor_name,
        address,
        phone_number,
        role: "VENDOR", // Always VENDOR for this registration endpoint
        verified_at: null, // Requires admin verification
      },
      select: {
        id: true,
        officer_name: true,
        email: true,
        vendor_name: true,
        role: true,
        created_at: true,
        verified_at: true,
      }
    });

    // Log successful registration (for audit purposes)
    console.log(`New vendor registered: ${email} (${vendor_name}) at ${new Date().toISOString()}`);

    return NextResponse.json(
      { 
        message: "Pendaftiran berhasil! Akun Anda sedang menunggu verifikasi admin.", 
        user: {
          id: newUser.id,
          officer_name: newUser.officer_name,
          email: newUser.email,
          vendor_name: newUser.vendor_name,
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