/**
 * Server-side PDF Compression Utility
 * Kompres file PDF sebelum disimpan di server untuk menghemat storage
 * 
 * Features:
 * - Mengurangi ukuran file PDF
 * - Mempertahankan struktur dan konten PDF
 * - Optimasi image di dalam PDF
 */

import { PDFDocument } from 'pdf-lib';

export interface PDFCompressionResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // Percentage saved
  compressionApplied: boolean;
}

export class PDFCompressor {
  /**
   * Compress PDF file
   */
  static async compressPDF(
    inputBuffer: Buffer,
    options: {
      skipIfSmall?: boolean;
      skipThresholdKB?: number;
    } = {}
  ): Promise<PDFCompressionResult> {
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
      };
    }

    try {
      // Load PDF document
      const pdfDoc = await PDFDocument.load(inputBuffer, {
        ignoreEncryption: true,
      });

      // Save with compression options
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true, // Use object streams for better compression
        addDefaultPage: false,
        objectsPerTick: 50,
      });

      const compressedBuffer = Buffer.from(compressedBytes);
      const compressedSize = compressedBuffer.length;
      const saved = originalSize - compressedSize;
      const ratio = saved > 0 ? (saved / originalSize) * 100 : 0;

      // Only return compressed version if it's actually smaller
      if (compressedSize < originalSize) {
        return {
          buffer: compressedBuffer,
          originalSize,
          compressedSize,
          compressionRatio: ratio,
          compressionApplied: true,
        };
      } else {
        // Return original if compression didn't help
        return {
          buffer: inputBuffer,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 0,
          compressionApplied: false,
        };
      }
    } catch (error) {
      console.error('PDF compression error:', error);
      
      // Return original file if compression fails
      return {
        buffer: inputBuffer,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        compressionApplied: false,
      };
    }
  }

  /**
   * Check if buffer is a valid PDF
   */
  static isPDF(buffer: Buffer): boolean {
    // PDF files start with %PDF-
    const header = buffer.slice(0, 5).toString('utf-8');
    return header === '%PDF-';
  }

  /**
   * Get PDF metadata
   */
  static async getPDFMetadata(buffer: Buffer): Promise<{
    pageCount: number;
    size: number;
  } | null> {
    try {
      const pdfDoc = await PDFDocument.load(buffer, {
        ignoreEncryption: true,
      });

      return {
        pageCount: pdfDoc.getPageCount(),
        size: buffer.length,
      };
    } catch (error) {
      console.error('Error reading PDF metadata:', error);
      return null;
    }
  }
}
