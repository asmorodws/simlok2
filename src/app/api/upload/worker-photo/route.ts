import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fileManager } from '@/lib/fileManager';

// Configure maximum file size (8MB)
const MAX_FILE_SIZE = 8 * 1024 * 1024;

// Allowed image types for worker photos
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png'
];

// Allowed image extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const workerName = formData.get('workerName') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!workerName) {
      return NextResponse.json({ error: 'Worker name is required' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: `File type not supported. Only images are allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
      }, { status: 400 });
    }

    // Validate file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json({ 
        error: `File extension not supported. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}` 
      }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save worker photo using special method
    const fileInfo = await fileManager.saveWorkerPhoto(
      buffer,
      file.name,
      session.user.id,
      workerName
    );

    return NextResponse.json({
      success: true,
      url: fileInfo.url,
      filename: fileInfo.newName,
      originalName: fileInfo.originalName,
      workerName: workerName,
      size: fileInfo.size,
      type: fileInfo.type,
      category: fileInfo.category,
      path: fileInfo.path
    });

  } catch (error) {
    console.error('Worker photo upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during worker photo upload' 
    }, { status: 500 });
  }
}

// GET /api/upload/worker-photo - Get upload info
export async function GET() {
  return NextResponse.json({
    maxFileSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_TYPES,
    allowedExtensions: ALLOWED_EXTENSIONS,
    description: 'Upload endpoint for worker photos with worker name as filename'
  });
}
