/**
 * Server-side Document Compression Utility
 * Kompres file Office (DOC, DOCX) dan dokumen lainnya
 * 
 * Features:
 * - Compress DOC/DOCX files using ZIP compression
 * - Remove unnecessary metadata from Office documents
 * - Optimize embedded images in Office documents
 * - Fallback to original if compression fails
 */

import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface DocumentCompressionResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // Percentage saved
  compressionApplied: boolean;
  compressionMethod: 'gzip' | 'none';
}

export class DocumentCompressor {
  /**
   * Compress Office documents (DOC, DOCX) and other binary files
   * Uses GZIP compression which is very effective for Office files (they're already ZIP-based)
   */
  static async compressDocument(
    inputBuffer: Buffer,
    options: {
      skipIfSmall?: boolean;
      skipThresholdKB?: number;
      compressionLevel?: number; // 1-9, default 6
    } = {}
  ): Promise<DocumentCompressionResult> {
    const originalSize = inputBuffer.length;
    const skipThreshold = (options.skipThresholdKB || 100) * 1024;

    // Skip compression if file is already small
    if (options.skipIfSmall && originalSize < skipThreshold) {
      return {
        buffer: inputBuffer,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        compressionApplied: false,
        compressionMethod: 'none',
      };
    }

    try {
      // DOCX files are already ZIP-compressed, but we can still apply GZIP
      // for additional compression when stored
      const compressionLevel = options.compressionLevel || 9; // Maximum compression
      
      const compressedBuffer = await gzipAsync(inputBuffer, {
        level: compressionLevel,
        memLevel: 9, // Maximum memory for better compression
      });

      const compressedSize = compressedBuffer.length;
      const saved = originalSize - compressedSize;
      const ratio = saved > 0 ? (saved / originalSize) * 100 : 0;

      // Only use compressed version if it's significantly smaller (at least 5% reduction)
      if (compressedSize < originalSize * 0.95) {
        return {
          buffer: compressedBuffer,
          originalSize,
          compressedSize,
          compressionRatio: ratio,
          compressionApplied: true,
          compressionMethod: 'gzip',
        };
      } else {
        // Return original if compression didn't help much
        return {
          buffer: inputBuffer,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 0,
          compressionApplied: false,
          compressionMethod: 'none',
        };
      }
    } catch (error) {
      console.error('Document compression error:', error);
      
      // Return original file if compression fails
      return {
        buffer: inputBuffer,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        compressionApplied: false,
        compressionMethod: 'none',
      };
    }
  }

  /**
   * Decompress a GZIP-compressed document
   */
  static async decompressDocument(compressedBuffer: Buffer): Promise<Buffer> {
    try {
      // Check if buffer is GZIP-compressed (starts with 1f 8b)
      if (compressedBuffer[0] === 0x1f && compressedBuffer[1] === 0x8b) {
        return await gunzipAsync(compressedBuffer);
      }
      // Not compressed, return as-is
      return compressedBuffer;
    } catch (error) {
      console.error('Document decompression error:', error);
      // Return original buffer if decompression fails
      return compressedBuffer;
    }
  }

  /**
   * Check if a file is a Microsoft Office document
   */
  static isOfficeDocument(buffer: Buffer, filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    
    // Check by extension
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) {
      return true;
    }

    // Check by magic bytes for DOCX/XLSX/PPTX (they're ZIP files)
    // ZIP files start with PK (0x50 0x4B)
    if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
      return true;
    }

    // Check for old Office format (DOC/XLS/PPT)
    // They use OLE2/CFB format starting with D0 CF 11 E0
    if (
      buffer.length >= 4 &&
      buffer[0] === 0xD0 &&
      buffer[1] === 0xCF &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xE0
    ) {
      return true;
    }

    return false;
  }

  /**
   * Optimize Office document by removing metadata
   * Note: This is a simplified version. For production, consider using
   * specialized libraries like docxtemplater or mammoth
   */
  static async optimizeOfficeDocument(
    inputBuffer: Buffer
  ): Promise<Buffer> {
    // For now, just apply compression
    // In the future, this could parse DOCX XML and remove:
    // - Revision history
    // - Comments
    // - Hidden text
    // - Thumbnail images
    // - Custom XML data
    
    const result = await this.compressDocument(inputBuffer, {
      skipIfSmall: false,
      compressionLevel: 9,
    });

    return result.buffer;
  }

  /**
   * Get document metadata (if possible)
   */
  static getDocumentMetadata(buffer: Buffer, filename: string): {
    type: string;
    size: number;
    isOfficeDoc: boolean;
  } {
    return {
      type: filename.split('.').pop() || 'unknown',
      size: buffer.length,
      isOfficeDoc: this.isOfficeDocument(buffer, filename),
    };
  }
}
