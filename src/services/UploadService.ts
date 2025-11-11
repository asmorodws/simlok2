/**
 * Upload Service
 * Business logic for file upload, validation, compression, and storage
 */

import { fileManager } from '@/lib/fileManager';
import { PDFCompressor } from '@/utils/pdf-compressor-server';
import { DocumentCompressor } from '@/utils/document-compressor-server';
import { logger } from '@/lib/logger';

// ==================== TYPE DEFINITIONS ====================

export interface UploadFileData {
  buffer: Buffer;
  filename: string;
  userId: string;
  mimeType: string;
  fieldName?: string;
}

export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
}

export interface UploadResult {
  success: boolean;
  url: string;
  filename: string;
  originalName: string;
  size: number;
  type: string;
  category?: string;
  path: string;
  compressionInfo?: string;
}

// ==================== CONSTANTS ====================

export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxFileSize: 8 * 1024 * 1024, // 8MB
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif'
  ],
  allowedExtensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif']
};

// ==================== UPLOAD SERVICE ====================

export class UploadService {
  /**
   * Validate file size
   */
  static validateFileSize(fileSize: number, maxSize: number = DEFAULT_UPLOAD_CONFIG.maxFileSize): void {
    if (fileSize > maxSize) {
      throw new Error(`File size too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
    }
  }

  /**
   * Validate file type
   */
  static validateFileType(mimeType: string, allowedTypes: string[] = DEFAULT_UPLOAD_CONFIG.allowedTypes): void {
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`File type not supported. Allowed types: ${DEFAULT_UPLOAD_CONFIG.allowedExtensions.join(', ')}`);
    }
  }

  /**
   * Validate file extension
   */
  static validateFileExtension(filename: string, allowedExtensions: string[] = DEFAULT_UPLOAD_CONFIG.allowedExtensions): void {
    const fileExtension = '.' + filename.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error(`File extension not supported. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }
  }

  /**
   * Compress file based on type (PDF, Office docs, images)
   */
  static async compressFile(buffer: Buffer, filename: string, mimeType: string): Promise<{ buffer: Buffer; compressionInfo: string }> {
    const fileExtension = '.' + filename.split('.').pop()?.toLowerCase();
    let compressedBuffer = buffer;
    let compressionInfo = '';

    try {
      // 1. Compress PDF files
      if (mimeType === 'application/pdf' || fileExtension === '.pdf') {
        const compressionResult = await PDFCompressor.compressPDF(buffer, {
          skipIfSmall: true,
          skipThresholdKB: 50,
          aggressiveCompression: true,
        });

        if (compressionResult.compressionApplied) {
          compressedBuffer = Buffer.from(compressionResult.buffer);
          compressionInfo = `PDF compressed: ${(compressionResult.originalSize / 1024).toFixed(1)}KB → ${(compressionResult.compressedSize / 1024).toFixed(1)}KB (saved ${compressionResult.compressionRatio.toFixed(1)}%)`;
          logger.info('UploadService', compressionInfo, { filename });
        } else {
          compressionInfo = `PDF kept original: ${(compressionResult.originalSize / 1024).toFixed(1)}KB (already optimized)`;
          logger.info('UploadService', compressionInfo, { filename });
        }
      }
      
      // 2. Compress Office documents (DOC, DOCX)
      else if (
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ['.doc', '.docx'].includes(fileExtension)
      ) {
        const compressionResult = await DocumentCompressor.compressDocument(buffer, {
          skipIfSmall: true,
          skipThresholdKB: 50,
          compressionLevel: 9,
        });

        if (compressionResult.compressionApplied) {
          compressedBuffer = Buffer.from(compressionResult.buffer);
          compressionInfo = `Office doc compressed (${compressionResult.compressionMethod}): ${(compressionResult.originalSize / 1024).toFixed(1)}KB → ${(compressionResult.compressedSize / 1024).toFixed(1)}KB (saved ${compressionResult.compressionRatio.toFixed(1)}%)`;
          logger.info('UploadService', compressionInfo, { filename });
        } else {
          compressionInfo = `Office doc kept original: ${(compressionResult.originalSize / 1024).toFixed(1)}KB (already optimized)`;
          logger.info('UploadService', compressionInfo, { filename });
        }
      }
      
      // 3. For images, just log (no compression for now)
      else if (mimeType.startsWith('image/')) {
        compressionInfo = `Image uploaded: ${(buffer.length / 1024).toFixed(1)}KB (no compression)`;
        logger.info('UploadService', compressionInfo, { filename });
      }
    } catch (error) {
      logger.error('UploadService', 'Compression failed, using original file', { error, filename });
      compressionInfo = 'Compression failed, using original';
      compressedBuffer = buffer;
    }

    return { buffer: compressedBuffer, compressionInfo };
  }

  /**
   * Upload file with validation and compression
   */
  static async uploadFile(data: UploadFileData, config?: Partial<UploadConfig>): Promise<UploadResult> {
    try {
      const uploadConfig = { ...DEFAULT_UPLOAD_CONFIG, ...config };

      // Validate file size
      this.validateFileSize(data.buffer.length, uploadConfig.maxFileSize);

      // Validate file type
      this.validateFileType(data.mimeType, uploadConfig.allowedTypes);

      // Validate file extension
      this.validateFileExtension(data.filename, uploadConfig.allowedExtensions);

      // Compress file
      const { buffer: compressedBuffer, compressionInfo } = await this.compressFile(
        data.buffer,
        data.filename,
        data.mimeType
      );

      // Save file using FileManager
      const fileInfo = await fileManager.saveFile(
        compressedBuffer,
        data.filename,
        data.userId,
        data.fieldName
      );

      logger.info('UploadService', 'File uploaded successfully', {
        userId: data.userId,
        filename: fileInfo.newName,
        size: fileInfo.size,
        compressionInfo
      });

      return {
        success: true,
        url: fileInfo.url,
        filename: fileInfo.newName,
        originalName: fileInfo.originalName,
        size: fileInfo.size,
        type: fileInfo.type,
        category: fileInfo.category,
        path: fileInfo.path,
        compressionInfo
      };
    } catch (error) {
      logger.error('UploadService', 'Upload failed', error);
      throw error;
    }
  }

  /**
   * Get upload configuration
   */
  static getUploadConfig(): UploadConfig {
    return DEFAULT_UPLOAD_CONFIG;
  }
}

export default UploadService;
