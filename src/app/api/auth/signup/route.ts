import { NextRequest, NextResponse } from 'next/server';
import { authService, vendorRegistrationSchema } from '@/services/AuthService';
import { verifyTurnstileToken } from '@/utils/security/turnstileMiddleware';

export async function POST(req: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    // Check rate limit
    if (!authService.checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan pendaftaran. Silakan coba lagi dalam 15 menit.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = vendorRegistrationSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err: any) => err.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { turnstile_token, ...registrationData } = validationResult.data;

    // Verify Turnstile token (only in production)
    if (process.env.NODE_ENV === 'production' && turnstile_token) {
      const isTurnstileValid = await verifyTurnstileToken(turnstile_token);
      if (!isTurnstileValid) {
        return NextResponse.json(
          { error: 'Verifikasi keamanan gagal. Silakan refresh halaman dan coba lagi.' },
          { status: 400 }
        );
      }
    }

    // Check if email exists
    const emailExists = await authService.checkEmailExists(registrationData.email);
    if (emailExists) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }

    // Check if vendor name exists
    const vendorExists = await authService.checkVendorNameExists(registrationData.vendor_name);
    if (vendorExists) {
      return NextResponse.json({ error: 'Nama vendor sudah terdaftar' }, { status: 409 });
    }

    // Register vendor
    const result = await authService.registerVendor({
      ...registrationData,
      turnstile_token,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal server. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
