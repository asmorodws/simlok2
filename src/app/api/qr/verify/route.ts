import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { qrVerificationService } from '@/services/QRVerificationService';
import { rateLimiter, RateLimitPresets, getRateLimitHeaders } from '@/lib/api/rateLimiter';

// POST /api/qr/verify - Verify QR code and return submission data
export const POST = withAuth(
  async (request: NextRequest, session) => {
    // Rate limiting
    const rateLimitResult = rateLimiter.check(
      session.user.id,
      RateLimitPresets.qrVerification
    );

    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult);
      const response = NextResponse.json(
        {
          success: false,
          error: RateLimitPresets.qrVerification.message,
          retryAfter: rateLimitResult.retryAfter
        },
        { status: 429, headers }
      );
      return response;
    }

    const body = await request.json();
    const { qrData, qr_data, scanLocation } = body;

    // Support both qrData and qr_data parameter names for compatibility
    const qrString = qr_data || qrData;

    if (!qrString) {
      return apiError('String QR/Barcode diperlukan', 400);
    }

    try {
      const result = await qrVerificationService.verifyQR(
        { qrString, scanLocation },
        session.user
      );
      return apiSuccess(result);
    } catch (error: any) {
      // Handle duplicate scan error
      if (error.code === 'DUPLICATE_SCAN') {
        return NextResponse.json({
          success: false,
          error: 'duplicate_scan_same_day',
          message: error.message,
          previousScan: error.previousScan
        }, { status: 409 });
      }
      throw error;
    }
  },
  { allowedRoles: ['VERIFIER', 'ADMIN'], requireAuth: true }
);

// GET /api/qr/verify - Get recent scan history (for admin/verifier dashboard)
export const GET = withAuth(
  async (request: NextRequest, session) => {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      submissionId: searchParams.get('submission_id') as string | undefined,
      search: searchParams.get('search') as string | undefined,
      status: searchParams.get('status') as string | undefined,
      dateFrom: searchParams.get('dateFrom') as string | undefined,
      dateTo: searchParams.get('dateTo') as string | undefined,
      location: searchParams.get('location') as string | undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const result = await qrVerificationService.getScanHistory(filters, session.user);
    return apiSuccess(result);
  },
  { allowedRoles: ['VERIFIER', 'ADMIN'], requireAuth: true }
);

