import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimiter, RateLimitPresets, getRateLimitHeaders } from '@/lib/rate-limiter';
import UploadService from '@/services/UploadService';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 20 uploads per minute per user
    const rateLimitResult = rateLimiter.check(
      `upload:${session.user.id}`,
      RateLimitPresets.upload
    );

    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult);
      return NextResponse.json(
        { 
          error: RateLimitPresets.upload.message,
          retryAfter: rateLimitResult.retryAfter 
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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload file using UploadService
    const uploadData: any = {
      buffer,
      filename: file.name,
      userId: session.user.id,
      mimeType: file.type,
    };
    
    if (fieldName) {
      uploadData.fieldName = fieldName;
    }

    const result = await UploadService.uploadFile(uploadData);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Upload error:', error);
    
    // Handle validation errors
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('size') || message.includes('type') || message.includes('extension')) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal server error during file upload' 
    }, { status: 500 });
  }
}

// GET /api/upload - Get upload info
export async function GET() {
  const config = UploadService.getUploadConfig();
  return NextResponse.json({
    maxFileSize: config.maxFileSize,
    allowedTypes: config.allowedTypes,
    allowedExtensions: config.allowedExtensions
  });
}
