import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string; category: string; filename: string }> }
) {
  try {
    // Get session to check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params for Next.js 15 compatibility
    const { userId, category, filename } = await params;

    // Check if user can access this file
    // Users can only access their own files, unless they're admin, reviewer, or approver
    const canAccess = 
      session.user.role === 'ADMIN' || 
      session.user.role === 'REVIEWER' || 
      session.user.role === 'APPROVER' ||
      session.user.id === userId;

    // Debug logging
    console.log('File access check:', {
      requestedUserId: userId,
      sessionUserId: session.user.id,
      userRole: session.user.role,
      category,
      filename,
      canAccess
    });
      
    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Map category to folder name
    const categoryFolders = {
      sika: 'dokumen-sika',
      simja: 'dokumen-simja',
      other: 'lainnya',
      'worker-photo': 'foto-pekerja'
    };

    const folderName = categoryFolders[category as keyof typeof categoryFolders];
    if (!folderName) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Construct file path
    const filePath = join(process.cwd(), 'public', 'uploads', userId, folderName, filename);

    // Check if file exists
    if (!existsSync(filePath)) {
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
