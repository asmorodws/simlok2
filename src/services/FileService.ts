import { fileManager } from '@/lib/file/fileManager';
import { PDFCompressor } from '@/utils/file/compression/pdfCompressor';
import { DocumentCompressor } from '@/utils/file/compression/documentCompressor';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

// Configuration
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif'];

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

interface CompressionResult {
  buffer: Buffer;
  info: string;
}

/**
 * Service for handling file uploads, validation, and compression
 */
class FileService {
  /**
   * Validate file size and type
   */
  validateFile(file: File): FileValidationResult {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `File type not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }

    // Validate file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return {
        valid: false,
        error: `File extension not supported. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate and compress PDF file
   */
  async validateAndCompressPDF(bytes: ArrayBuffer, fileName: string): Promise<CompressionResult> {
    let buffer = Buffer.from(bytes);
    
    // PDF Validation
    console.log('🔍 Starting PDF validation...');
    const { PDFDocument } = await import('pdf-lib');

    // Capture console warnings to detect corruption
    const originalWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (...args: any[]) => {
      const msg = args.map((a) => String(a)).join(' ');
      warnings.push(msg);
      originalWarn.apply(console, args);
    };

    try {
      const pdfDoc = await PDFDocument.load(bytes, {
        ignoreEncryption: true,
        updateMetadata: false,
      });

      console.warn = originalWarn;

      // Check for corruption warnings
      const hasCorruptionWarning = warnings.some(
        (w) =>
          w.includes('Invalid object ref') ||
          w.includes('Trying to parse invalid object') ||
          w.includes('Failed to parse') ||
          w.includes('corrupt') ||
          w.includes('missing') ||
          w.includes('invalid')
      );

      if (hasCorruptionWarning) {
        console.error('❌ PDF validation FAILED - corruption detected');
        console.error('Corruption warnings:', warnings);
        throw new Error(
          'PDF_CORRUPT: File PDF tidak valid atau rusak. PDF memiliki struktur internal yang corrupt. Silakan gunakan file PDF yang valid.'
        );
      }

      // Ensure PDF has pages
      const pageCount = pdfDoc.getPageCount();
      if (pageCount === 0) {
        console.error('❌ PDF validation FAILED - no pages');
        throw new Error('PDF_CORRUPT: File PDF tidak memiliki halaman. File mungkin rusak.');
      }

      console.log(`✅ PDF validation passed (${pageCount} pages)`);
    } catch (loadError) {
      console.warn = originalWarn;

      if (loadError instanceof Error && loadError.message.startsWith('PDF_CORRUPT:')) {
        throw loadError;
      }

      console.error('❌ PDF validation FAILED - parse error');
      throw new Error(
        'PDF_CORRUPT: File PDF tidak valid atau rusak. PDF memiliki struktur internal yang corrupt. Silakan gunakan file PDF yang valid.'
      );
    }

    // Compress PDF
    try {
      const compressionResult = await PDFCompressor.compressPDF(buffer, {
        skipIfSmall: true,
        skipThresholdKB: 50,
        aggressiveCompression: true,
      });

      if (compressionResult.compressionApplied) {
        buffer = Buffer.from(compressionResult.buffer);
        const info = `PDF compressed: ${(compressionResult.originalSize / 1024).toFixed(1)}KB → ${(
          compressionResult.compressedSize / 1024
        ).toFixed(1)}KB (saved ${compressionResult.compressionRatio.toFixed(1)}%)`;
        console.log(`✅ ${info} - ${fileName}`);
        return { buffer, info };
      } else {
        const info = `PDF kept original: ${(compressionResult.originalSize / 1024).toFixed(
          1
        )}KB (already optimized)`;
        console.log(`ℹ️ ${info} - ${fileName}`);
        return { buffer, info };
      }
    } catch (error) {
      console.error('⚠️ PDF compression failed, using original:', error);
      return { buffer, info: 'PDF compression failed, using original' };
    }
  }

  /**
   * Compress Office document (DOC, DOCX)
   */
  async compressDocument(buffer: Buffer, fileName: string): Promise<CompressionResult> {
    try {
      const compressionResult = await DocumentCompressor.compressDocument(buffer, {
        skipIfSmall: true,
        skipThresholdKB: 50,
        compressionLevel: 9,
      });

      if (compressionResult.compressionApplied) {
        const newBuffer = Buffer.from(compressionResult.buffer);
        const info = `Office doc compressed (${compressionResult.compressionMethod}): ${(
          compressionResult.originalSize / 1024
        ).toFixed(1)}KB → ${(compressionResult.compressedSize / 1024).toFixed(1)}KB (saved ${compressionResult.compressionRatio.toFixed(1)}%)`;
        console.log(`✅ ${info} - ${fileName}`);
        return { buffer: newBuffer, info };
      } else {
        const info = `Office doc kept original: ${(compressionResult.originalSize / 1024).toFixed(
          1
        )}KB (already optimized)`;
        console.log(`ℹ️ ${info} - ${fileName}`);
        return { buffer, info };
      }
    } catch (error) {
      console.error('⚠️ Office document compression failed:', error);
      return { buffer, info: 'Office document compression failed, using original' };
    }
  }

  /**
   * Process and upload file
   */
  async processAndUploadFile(
    file: File,
    userId: string,
    fieldName?: string
  ): Promise<{
    success: boolean;
    url: string;
    filename: string;
    originalName: string;
    size: number;
    type: string;
    category?: string;
    path: string;
    compressionInfo: string;
  }> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);
    let compressionInfo = '';

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    // Process based on file type
    if (file.type === 'application/pdf' || fileExtension === '.pdf') {
      const result = await this.validateAndCompressPDF(bytes, file.name);
      buffer = Buffer.from(result.buffer);
      compressionInfo = result.info;
    } else if (
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ['.doc', '.docx'].includes(fileExtension)
    ) {
      const result = await this.compressDocument(buffer, file.name);
      buffer = Buffer.from(result.buffer);
      compressionInfo = result.info;
    } else if (file.type.startsWith('image/')) {
      compressionInfo = `Image uploaded: ${(buffer.length / 1024).toFixed(1)}KB (no compression)`;
      console.log(`📷 ${compressionInfo} - ${file.name}`);
    }

    // Save file
    const fileInfo = await fileManager.saveFile(buffer, file.name, userId, fieldName);

    return {
      success: true,
      url: fileInfo.url,
      filename: fileInfo.newName,
      originalName: fileInfo.originalName,
      size: fileInfo.size,
      type: fileInfo.type,
      category: fileInfo.category,
      path: fileInfo.path,
      compressionInfo,
    };
  }

  /**
   * Get upload configuration
   */
  getUploadConfig() {
    return {
      maxFileSize: MAX_FILE_SIZE,
      allowedTypes: ALLOWED_TYPES,
      allowedExtensions: ALLOWED_EXTENSIONS,
    };
  }

  /**
   * Get file path and metadata for serving
   */
  getFileForServing(userId: string, category: string, filename: string) {
    // Map category to folder name
    const categoryFolders: Record<string, string> = {
      sika: 'dokumen-sika',
      simja: 'dokumen-simja',
      'work-order': 'dokumen-work-order',
      'kontrak-kerja': 'dokumen-kontrak-kerja',
      jsa: 'dokumen-jsa',
      'hsse-worker': 'dokumen-hsse-pekerja',
      'worker-photo': 'foto-pekerja',
    };

    const folderName = categoryFolders[category];
    if (!folderName) {
      throw new Error('Invalid category');
    }

    // Construct file path
    const filePath = join(process.cwd(), 'public', 'uploads', userId, folderName, filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      throw new Error('File not found');
    }

    // Get file stats
    const fileStats = statSync(filePath);
    const fileSize = fileStats.size;

    // Determine content type
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

    return {
      filePath,
      fileSize,
      contentType,
      fileStats,
      filename,
    };
  }

  /**
   * Check if user can access file
   */
  canAccessFile(userId: string, userRole: string, fileOwnerId: string): boolean {
    return (
      userRole === 'SUPER_ADMIN' ||
      userRole === 'REVIEWER' ||
      userRole === 'APPROVER' ||
      userId === fileOwnerId
    );
  }
}

// Export singleton instance
export const fileService = new FileService();
