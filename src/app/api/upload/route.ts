import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { fileManager } from '@/lib/fileManager';

// Configure maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif'
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif'];

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
    const fieldName = formData.get('fieldName') as string | null; // Optional field to determine category

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
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
        error: `File type not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}` 
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

    // Save file using FileManager
    const fileInfo = await fileManager.saveFile(
      buffer,
      file.name,
      session.user.id,
      fieldName || undefined
    );

    return NextResponse.json({
      success: true,
      url: fileInfo.url,
      filename: fileInfo.newName,
      originalName: fileInfo.originalName,
      size: fileInfo.size,
      type: fileInfo.type,
      category: fileInfo.category,
      path: fileInfo.path
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during file upload' 
    }, { status: 500 });
  }
}

// GET /api/upload - Get upload info (optional)
export async function GET() {
  return NextResponse.json({
    maxFileSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_TYPES,
    allowedExtensions: ALLOWED_EXTENSIONS
  });
}
