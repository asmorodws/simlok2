import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { requireSessionWithRole } from '@/lib/auth/roleHelpers';
import { fileService } from '@/services/FileService';

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
    // Get session
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, [
      'VENDOR',
      'REVIEWER',
      'APPROVER',
      'ADMIN',
      'SUPER_ADMIN',
      'VERIFIER',
    ]);
    if (userOrError instanceof NextResponse) return userOrError;

    const { userId, category, filename } = await params;

    // Check access permissions
    if (!fileService.canAccessFile(userOrError.id, userOrError.role, userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get file metadata
    const { filePath, fileSize, contentType, fileStats } = fileService.getFileForServing(
      userId,
      category,
      filename
    );

    // Handle range requests (for PDF preview, video streaming, etc.)
    const range = _request.headers.get('range');
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0] || '0', 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = createReadStream(filePath, { start, end });
      const webStream = nodeStreamToWebStream(stream);

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Full file streaming
    const stream = createReadStream(filePath);
    const webStream = nodeStreamToWebStream(stream);

    const isFromPdf = _request.headers.get('x-pdf-generation') === 'true';
    const cacheControl = isFromPdf
      ? 'no-cache, no-store, must-revalidate'
      : 'public, max-age=31536000, immutable';

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'Content-Disposition': `inline; filename="${filename}"`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': cacheControl,
        'Pragma': isFromPdf ? 'no-cache' : 'public',
        'ETag': `"${fileStats.mtime.getTime()}-${fileSize}"`,
      },
    });
  } catch (error) {
    console.error('File serving error:', error);
    if (error instanceof Error) {
      if (error.message === 'Invalid category') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message === 'File not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
