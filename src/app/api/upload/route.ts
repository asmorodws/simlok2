import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { rateLimiter, RateLimitPresets, getRateLimitHeaders } from '@/lib/api/rateLimiter';
import { requireSessionWithRole } from '@/lib/auth/roleHelpers';
import { fileService } from '@/services/FileService';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(
      session,
      ['VENDOR', 'REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN', 'VERIFIER', 'VISITOR']
    );
    if (userOrError instanceof NextResponse) return userOrError;

    // Rate limiting: 20 uploads per minute per user
    const rateLimitResult = rateLimiter.check(
      `upload:${userOrError.id}`,
      RateLimitPresets.upload
    );

    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult);
      return NextResponse.json(
        {
          error: RateLimitPresets.upload.message,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429, headers }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fieldName = formData.get('fieldName') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Process and upload via service
    const result = await fileService.processAndUploadFile(
      file,
      userOrError.id,
      fieldName || undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Upload error:', error);

    // Handle PDF corruption errors
    if (error instanceof Error && error.message.startsWith('PDF_CORRUPT:')) {
      return NextResponse.json(
        { error: error.message.replace('PDF_CORRUPT: ', '') },
        { status: 400 }
      );
    }

    // Handle validation errors
    if (error instanceof Error && error.message.includes('not supported')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error during file upload' },
      { status: 500 }
    );
  }
}

// GET /api/upload - Get upload configuration
export async function GET() {
  const config = fileService.getUploadConfig();
  return NextResponse.json(config);
}

