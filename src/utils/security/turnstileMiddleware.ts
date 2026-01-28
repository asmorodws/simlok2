// utils/turnstile-middleware.ts
import { NextRequest } from 'next/server';

export async function verifyTurnstileMiddleware(request: NextRequest): Promise<{ success: boolean; error?: string }> {
  try {
    const body = await request.json();
    const turnstileToken = body.turnstile_token;

    if (!turnstileToken) {
      return { success: false, error: "Token keamanan diperlukan" };
    }

    // Verify Turnstile token
    const formData = new FormData();
    formData.append('secret', process.env.TURNSTILE_SECRET_KEY!);
    formData.append('response', turnstileToken);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    if (!result.success) {
      console.error('Turnstile verification failed:', result['error-codes']);
      return { success: false, error: "Verifikasi keamanan gagal" };
    }

    return { success: true };
  } catch (error) {
    console.error('Turnstile middleware error:', error);
    return { success: false, error: "Kesalahan verifikasi keamanan" };
  }
}

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('secret', process.env.TURNSTILE_SECRET_KEY!);
    formData.append('response', token);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}