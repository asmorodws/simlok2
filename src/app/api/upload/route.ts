import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { fileManager } from '@/lib/file/fileManager';
import { PDFCompressor } from '@/utils/file/compression/pdfCompressor';
import { DocumentCompressor } from '@/utils/file/compression/documentCompressor';
import { rateLimiter, RateLimitPresets, getRateLimitHeaders } from '@/lib/api/rateLimiter';
import { requireSessionWithRole } from '@/lib/auth/roleHelpers';

// Configure maximum file size (8MB before compression)
const MAX_FILE_SIZE = 8 * 1024 * 1024;

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
    // Check authentication (all authenticated users can upload)
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, ['VENDOR', 'REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN', 'VERIFIER', 'VISITOR']);
    if (userOrError instanceof NextResponse) return userOrError;

    // ========== RATE LIMITING ==========
    // Prevent abuse: 20 uploads per minute per user
    const rateLimitResult = rateLimiter.check(
      `upload:${userOrError.id}`,
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
    let buffer = Buffer.from(bytes);
    let compressionInfo = '';

    // ========== COMPRESS FILES BASED ON TYPE ==========
    
    // 1. Validate and compress PDF files
    if (file.type === 'application/pdf' || fileExtension === '.pdf') {
      // VALIDATION: Try to load PDF first to ensure it's not corrupted
      // This catches PDFs with invalid object references that browsers might still open
      console.log('🔍 Starting PDF validation...');
      const { PDFDocument } = await import('pdf-lib');
      
      // Capture console warnings to detect corruption
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (...args: any[]) => {
        const msg = args.map(a => String(a)).join(' ');
        warnings.push(msg);
        originalWarn.apply(console, args);
      };
      
      try {
        const pdfDoc = await PDFDocument.load(bytes, {
          ignoreEncryption: true,
          updateMetadata: false,
        });
        
        // Restore console.warn
        console.warn = originalWarn;
        
        // Check for corruption warnings
        const hasCorruptionWarning = warnings.some(w => 
          w.includes('Invalid object ref') ||
          w.includes('Trying to parse invalid object') ||
          w.includes('Failed to parse') ||
          w.includes('corrupt') ||
          w.includes('missing') ||
          w.includes('invalid')
        );
        
        if (hasCorruptionWarning) {
          console.error('❌ PDF validation FAILED - corruption detected in warnings');
          console.error('Corruption warnings:', warnings);
          console.log('🛑 REJECTING upload - throwing error');
          
          throw new Error('PDF_CORRUPT: File PDF tidak valid atau rusak. PDF memiliki struktur internal yang corrupt. Silakan gunakan file PDF yang valid.');
        }
        
        // Additional validation: ensure PDF has pages
        const pageCount = pdfDoc.getPageCount();
        if (pageCount === 0) {
          console.error('❌ PDF validation FAILED - no pages');
          throw new Error('PDF_CORRUPT: File PDF tidak memiliki halaman. File mungkin rusak.');
        }
        
        console.log(`✅ PDF validation passed (${pageCount} pages, no corruption warnings)`);
      } catch (loadError) {
        // Restore console.warn in case of error
        console.warn = originalWarn;
        
        // Check if it's our custom error
        if (loadError instanceof Error && loadError.message.startsWith('PDF_CORRUPT:')) {
          throw loadError; // Re-throw our custom error
        }
        
        console.error('❌ PDF validation FAILED - parse error');
        console.error('Error details:', loadError);
        console.log('🛑 REJECTING upload - throwing error');
        
        // Throw error with specific message so outer catch can handle it properly
        throw new Error('PDF_CORRUPT: File PDF tidak valid atau rusak. PDF memiliki struktur internal yang corrupt. Silakan gunakan file PDF yang valid.');
      }
      
      console.log('📦 Validation passed, proceeding to compression...');
      
      // If validation passed, proceed with compression
      try {
        const compressionResult = await PDFCompressor.compressPDF(buffer, {
          skipIfSmall: true,
          skipThresholdKB: 50,
          aggressiveCompression: true,
        });

        if (compressionResult.compressionApplied) {
          buffer = Buffer.from(compressionResult.buffer);
          compressionInfo = `PDF compressed: ${(compressionResult.originalSize / 1024).toFixed(1)}KB → ${(compressionResult.compressedSize / 1024).toFixed(1)}KB (saved ${compressionResult.compressionRatio.toFixed(1)}%)`;
          console.log(`✅ ${compressionInfo} - ${file.name}`);
        } else {
          compressionInfo = `PDF kept original: ${(compressionResult.originalSize / 1024).toFixed(1)}KB (already optimized)`;
          console.log(`ℹ️ ${compressionInfo} - ${file.name}`);
        }
      } catch (error) {
        console.error('⚠️ PDF compression failed, using original file:', error);
        compressionInfo = 'PDF compression failed, using original';
      }
    }
    
    // 2. Compress Office documents (DOC, DOCX)
    else if (
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ['.doc', '.docx'].includes(fileExtension)
    ) {
      try {
        const compressionResult = await DocumentCompressor.compressDocument(buffer, {
          skipIfSmall: true,
          skipThresholdKB: 50,
          compressionLevel: 9, // Maximum compression
        });

        if (compressionResult.compressionApplied) {
          buffer = Buffer.from(compressionResult.buffer);
          compressionInfo = `Office doc compressed (${compressionResult.compressionMethod}): ${(compressionResult.originalSize / 1024).toFixed(1)}KB → ${(compressionResult.compressedSize / 1024).toFixed(1)}KB (saved ${compressionResult.compressionRatio.toFixed(1)}%)`;
          console.log(`✅ ${compressionInfo} - ${file.name}`);
        } else {
          compressionInfo = `Office doc kept original: ${(compressionResult.originalSize / 1024).toFixed(1)}KB (already optimized)`;
          console.log(`ℹ️ ${compressionInfo} - ${file.name}`);
        }
      } catch (error) {
        console.error('⚠️ Office document compression failed, using original file:', error);
        compressionInfo = 'Office document compression failed, using original';
      }
    }
    
    // 3. For images, just log (no compression for now, can add Sharp later)
    else if (file.type.startsWith('image/')) {
      compressionInfo = `Image uploaded: ${(buffer.length / 1024).toFixed(1)}KB (no compression)`;
      console.log(`📷 ${compressionInfo} - ${file.name}`);
    }

    // Save file using FileManager
    const fileInfo = await fileManager.saveFile(
      buffer,
      file.name,
      userOrError.id,
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
    
    // Check if it's a PDF corruption error
    if (error instanceof Error && error.message.startsWith('PDF_CORRUPT:')) {
      const errorMessage = error.message.replace('PDF_CORRUPT: ', '');
      return NextResponse.json({ 
        error: errorMessage
      }, { status: 400 });
    }
    
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
