import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createReadStream, statSync, existsSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';

/**
 * Convert Node.js Readable stream to Web ReadableStream
 */
function nodeStreamToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      nodeStream.on('end', () => {
        controller.close();
      });
      nodeStream.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

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
    // Users can only access their own files, unless they're super admin, reviewer, or approver
    const canAccess = 
      session.user.role === 'SUPER_ADMIN' || 
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
      canAccess,
      isPdfGenerationContext: _request.headers.get('x-pdf-generation') === 'true'
    });
      
    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Map category to folder name
    const categoryFolders = {
      sika: 'dokumen-sika',
      simja: 'dokumen-simja',
      'work-order': 'dokumen-work-order',
      'kontrak-kerja': 'dokumen-kontrak-kerja',
      jsa: 'dokumen-jsa',
      'hsse-worker': 'dokumen-hsse-pekerja',
      'worker-photo': 'foto-pekerja'
    };

    const folderName = categoryFolders[category as keyof typeof categoryFolders];
    if (!folderName) {
      console.error('Invalid category:', category);
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Construct file path
    const filePath = join(process.cwd(), 'public', 'uploads', userId, folderName, filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Get file stats for size and range support
    const fileStats = statSync(filePath);
    const fileSize = fileStats.size;

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

    // ========== RANGE REQUEST SUPPORT (for partial content) ==========
    // This allows browsers to request only part of the file (great for PDF preview)
    const range = _request.headers.get('range');
    
    if (range) {
      // Parse range header: "bytes=start-end"
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0] || '0', 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // Create read stream for the requested range
      const stream = createReadStream(filePath, { start, end });
      const webStream = nodeStreamToWebStream(stream);

      console.log('📄 Serving partial content (range request):', {
        filename,
        fileSize,
        range: `${start}-${end}`,
        chunkSize,
        contentType
      });

      // Return partial content (206)
      return new NextResponse(webStream, {
        status: 206, // Partial Content
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year (files are immutable)
        },
      });
    }

    // ========== FULL FILE STREAMING (for complete download) ==========
    // Use streaming instead of loading entire file to memory
    const stream = createReadStream(filePath);
    const webStream = nodeStreamToWebStream(stream);

    // Debug logging for PDF generation context
    const isFromPdf = _request.headers.get('x-pdf-generation') === 'true';
    const cacheControl = isFromPdf 
      ? 'no-cache, no-store, must-revalidate' 
      : 'public, max-age=31536000, immutable'; // Cache for 1 year (files are immutable)

    console.log('📄 File serving (streaming):', {
      filePath,
      fileSize,
      contentType,
      isFromPdf,
      cacheControl,
      supportsRangeRequests: true
    });

    // Return file with streaming and proper headers
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'Content-Disposition': `inline; filename="${filename}"`,
        'Accept-Ranges': 'bytes', // Advertise range support
        'Cache-Control': cacheControl,
        'Pragma': isFromPdf ? 'no-cache' : 'public',
        'ETag': `"${fileStats.mtime.getTime()}-${fileSize}"`, // ETag for cache validation
      },
    });

  } catch (error) {
    console.error('File serving error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
