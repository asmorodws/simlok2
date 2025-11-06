import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/singletons';
import { responseCache, CacheTTL, CacheTags, generateCacheKey } from '@/lib/response-cache';

/**
 * GET /api/submissions/simlok/next-number
 * 
 * Endpoint untuk mendapatkan nomor SIMLOK berikutnya untuk preview di UI.
 * Menggunakan logic yang sama dengan approve endpoint untuk konsistensi.
 * 
 * Query params:
 * - year: tahun untuk nomor SIMLOK (opsional, default: tahun sekarang)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const yearParam = searchParams.get('year');
    // Use Jakarta timezone for current year
    const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const now = new Date(jakartaNow);
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

    // Validate year
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: 'Invalid year parameter' },
        { status: 400 }
      );
    }

    // Try cache first (short TTL because number changes frequently)
    const cacheKey = generateCacheKey('simlok-next-number', { year });
    const cached = responseCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query last SIMLOK number (semua tahun, tidak direset per tahun)
    // Nomor SIMLOK terus bertambah secara berurutan
    const lastSubmission = await prisma.submission.findFirst({
      where: {
        simlok_number: {
          not: null,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      select: {
        simlok_number: true,
      },
    });

    let nextNumber = 1;

    if (lastSubmission?.simlok_number) {
      // Extract number dari format: "123/S00330/2025-S0"
      // Menggunakan split untuk mendapatkan bagian pertama
      const parts = lastSubmission.simlok_number.split('/');
      const firstPart = parts[0];
      
      if (firstPart) {
        const currentNumber = parseInt(firstPart, 10);
        
        if (!isNaN(currentNumber) && currentNumber > 0) {
          nextNumber = currentNumber + 1;
        } else {
          // Invalid format, fallback ke 1
          console.warn('Invalid SIMLOK number format, using fallback:', lastSubmission.simlok_number);
          nextNumber = 1;
        }
      } else {
        // Empty first part, fallback ke 1
        console.warn('Empty SIMLOK number first part, using fallback:', lastSubmission.simlok_number);
        nextNumber = 1;
      }
    }

    const nextSimlokNumber = `${nextNumber}/S00330/${year}-S0`;

    const response = NextResponse.json({
      nextSimlokNumber,
      year,
      lastNumber: lastSubmission?.simlok_number || null,
    });

    // Cache for 30 seconds (short because it changes with each submission)
    responseCache.set(
      cacheKey,
      response,
      CacheTTL.SHORT,
      [CacheTags.SUBMISSIONS]
    );

    return response;
  } catch (error) {
    console.error('Error generating next SIMLOK number:', error);
    return NextResponse.json(
      { error: 'Failed to generate next SIMLOK number' },
      { status: 500 }
    );
  }
}
