import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; filename: string }> }
) {
  try {
    // Get session to check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params for Next.js 15 compatibility
    const { userId, filename } = await params;

    // Check if user can access this file
    // Users can only access their own files, unless they're admin
    if (session.user.role !== 'ADMIN' && session.user.id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Try to find file in organized structure first
    const userBaseDir = join(process.cwd(), 'public', 'uploads', userId);
    const folders = [
      join(userBaseDir, 'dokumen-sika'),
      join(userBaseDir, 'dokumen-simja'),
      join(userBaseDir, 'id-card'),
      join(userBaseDir, 'lainnya'),
      userBaseDir // Fallback to old structure
    ];

    let filePath: string | null = null;
    
    // Search for file in all possible locations
    for (const folder of folders) {
      const testPath = join(folder, filename);
      if (existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }

    if (!filePath) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine content type based on file extension
    const extension = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'doc':
        contentType = 'application/msword';
        break;
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    }

    // Return file with proper headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('File serving error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
