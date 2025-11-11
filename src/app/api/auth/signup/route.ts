// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { notifyAdminNewVendor } from "@/server/events";
import { verifyTurnstileToken } from "@/utils/turnstile-middleware";
import UserService from "@/services/UserService";

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

    // Parse request body
    const body = await req.json();
    const { turnstile_token, ...vendorData } = body;

    // Verify Turnstile token (only in production)
    if (process.env.NODE_ENV === 'production' && turnstile_token) {
      const isTurnstileValid = await verifyTurnstileToken(turnstile_token);
      if (!isTurnstileValid) {
        return NextResponse.json({ 
          error: "Verifikasi keamanan gagal. Silakan refresh halaman dan coba lagi." 
        }, { status: 400 });
      }
    }

    // Register vendor using UserService
    const newUser = await UserService.registerVendor(vendorData);

    // Notify admin and reviewer about new vendor registration
    await notifyAdminNewVendor(newUser.id);
    
    const { notifyReviewerNewUser } = await import('@/server/events');
    await notifyReviewerNewUser(newUser.id);

    // Return response
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
        },
        redirectTo: "/verification-pending",
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Registration error:", error);
    
    // Handle known errors with specific messages
    if (error instanceof Error) {
      const message = error.message;
      
      // Email already exists
      if (message.includes("Email sudah terdaftar")) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      
      // Vendor name already exists
      if (message.includes("Nama vendor sudah terdaftar")) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      
      // Validation errors
      if (message.includes("minimal") || message.includes("maksimal") || 
          message.includes("Format") || message.includes("wajib")) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    
    // Generic error for everything else
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server. Silakan coba lagi." }, 
      { status: 500 }
    );
  }
}