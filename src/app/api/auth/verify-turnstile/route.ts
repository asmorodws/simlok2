import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token Turnstile tidak ditemukan' },
        { status: 400 }
      );
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Konfigurasi server tidak valid' },
        { status: 500 }
      );
    }

    // Verify token with Cloudflare Turnstile API
    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        // Optionally add remoteip for additional verification
        // remoteip: request.ip || '',
      }),
    });

    const verifyResult = await verifyResponse.json();

    if (!verifyResult.success) {
      console.error('Turnstile verification failed:', verifyResult['error-codes']);
      return NextResponse.json(
        { 
          error: 'Verifikasi keamanan gagal',
          details: verifyResult['error-codes'] 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Verifikasi berhasil' 
    });

  } catch (error) {
    console.error('Turnstile verification error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server saat verifikasi' },
      { status: 500 }
    );
  }
}