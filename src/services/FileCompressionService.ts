/**
 * File Compression Service
 * Handles file compression with configurable quality and size limits
 */

import sharp from 'sharp';
import { writeFile, readFile } from 'fs/promises';

interface CompressionOptions {
  maxSizeBytes: number;
  quality: number;
  format?: 'jpeg' | 'png' | 'webp';
  maxWidth?: number;
  maxHeight?: number;
  outputDir?: string;
}

interface CompressionResult {
  success: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  filePath: string;
  outputPath?: string;
  error?: string;
}

export class FileCompressionService {
  private static readonly DEFAULT_QUALITY = 60;
  private static readonly DEFAULT_MAX_SIZE = 2 * 1024 * 1024; // 2MB
  private static readonly DEFAULT_MAX_WIDTH = 2048;
  private static readonly DEFAULT_MAX_HEIGHT = 2048;

  /**
   * Compress an image file with specified options
   */
  static async compressImage(
    inputPath: string,
    options: Partial<CompressionOptions> = {}
  ): Promise<CompressionResult> {
    const config: CompressionOptions = {
      maxSizeBytes: options.maxSizeBytes || this.DEFAULT_MAX_SIZE,
      quality: options.quality || this.DEFAULT_QUALITY,
      format: options.format || 'jpeg',
      maxWidth: options.maxWidth || this.DEFAULT_MAX_WIDTH,
      maxHeight: options.maxHeight || this.DEFAULT_MAX_HEIGHT,
      outputDir: options.outputDir || '',
    };

    try {
      // Read original file
      const originalBuffer = await readFile(inputPath);
      const originalSize = originalBuffer.length;

      // If already within size limits, return as is
      if (originalSize <= config.maxSizeBytes) {
        return {
          success: true,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1.0,
          filePath: inputPath,
          outputPath: inputPath,
        };
      }

      // Get metadata
      const metadata = await sharp(originalBuffer).metadata();
      
      // Determine output format
      const outputFormat = config.format || this.getOutputFormat(metadata.format);
      
      // Calculate resize dimensions if needed
      const { width, height } = this.calculateDimensions(
        metadata.width || 0,
        metadata.height || 0,
        config.maxWidth!,
        config.maxHeight!
      );

      // Start with initial quality
      let currentQuality = config.quality;
      let compressedBuffer: Buffer;
      let iterations = 0;
      const maxIterations = 5;

      do {
        // Apply compression
        let sharpInstance = sharp(originalBuffer)
          .resize(width, height, { 
            fit: 'inside',
            withoutEnlargement: true 
          });

        // Apply format-specific compression
        switch (outputFormat) {
          case 'jpeg':
            sharpInstance = sharpInstance.jpeg({ 
              quality: currentQuality,
              progressive: true,
              mozjpeg: true
            });
            break;
          case 'png':
            sharpInstance = sharpInstance.png({ 
              quality: currentQuality,
              compressionLevel: 9,
              progressive: true
            });
            break;
          case 'webp':
            sharpInstance = sharpInstance.webp({ 
              quality: currentQuality,
              effort: 6
            });
            break;
        }

        compressedBuffer = await sharpInstance.toBuffer();

        // Check if size is acceptable
        if (compressedBuffer.length <= config.maxSizeBytes || currentQuality <= 20) {
          break;
        }

        // Reduce quality for next iteration
        currentQuality = Math.max(20, currentQuality - 10);
        iterations++;

      } while (iterations < maxIterations);

      // Generate output path
      const outputPath = this.generateOutputPath(inputPath, outputFormat, config.outputDir);

      // Save compressed file
      await writeFile(outputPath, compressedBuffer);

      const compressionRatio = compressedBuffer.length / originalSize;

      console.log(`✅ Image compressed: ${this.formatFileSize(originalSize)} -> ${this.formatFileSize(compressedBuffer.length)} (${Math.round((1 - compressionRatio) * 100)}% reduction)`);

      return {
        success: true,
        originalSize,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        filePath: inputPath,
        outputPath,
      };

    } catch (error) {
      console.error('Compression error:', error);
      return {
        success: false,
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 0,
        filePath: inputPath,
        error: error instanceof Error ? error.message : 'Unknown compression error',
      };
    }
  }

  /**
   * Compress a PDF file (placeholder - requires pdf-lib or similar)
   */
  static async compressPDF(
    inputPath: string,
    options: Partial<CompressionOptions> = {}
  ): Promise<CompressionResult> {
    try {
      const originalBuffer = await readFile(inputPath);
      const originalSize = originalBuffer.length;

      // For now, just return the original if within limits
      if (originalSize <= (options.maxSizeBytes || this.DEFAULT_MAX_SIZE)) {
        return {
          success: true,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1.0,
          filePath: inputPath,
          outputPath: inputPath,
        };
      }

      // PDF compression would require additional libraries
      console.warn('PDF compression not implemented yet');
      return {
        success: false,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
        filePath: inputPath,
        error: 'PDF compression not implemented',
      };

    } catch (error) {
      return {
        success: false,
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 0,
        filePath: inputPath,
        error: error instanceof Error ? error.message : 'PDF compression failed',
      };
    }
  }

  /**
   * Check if file type can be compressed
   */
  static canCompress(mimeType: string): boolean {
    const compressibleTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/pdf'
    ];
    return compressibleTypes.includes(mimeType);
  }

  /**
   * Generic file compression method
   */
  static async compressFile(
    inputPath: string,
    options: Partial<CompressionOptions> = {}
  ): Promise<CompressionResult> {
    // Detect file type from extension
    const ext = inputPath.toLowerCase().split('.').pop();
    
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      return this.compressImage(inputPath, options);
    } else if (ext === 'pdf') {
      return this.compressPDF(inputPath, options);
    } else {
      return {
        success: false,
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 0,
        filePath: inputPath,
        error: `Unsupported file type: ${ext}`,
      };
    }
  }

  /**
   * Calculate optimal dimensions while maintaining aspect ratio
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio);

    return {
      width: Math.round(originalWidth * ratio),
      height: Math.round(originalHeight * ratio),
    };
  }

  /**
   * Get appropriate output format based on input
   */
  private static getOutputFormat(inputFormat?: string): 'jpeg' | 'png' | 'webp' {
    switch (inputFormat?.toLowerCase()) {
      case 'png':
        return 'png';
      case 'webp':
        return 'webp';
      default:
        return 'jpeg';
    }
  }

  /**
   * Generate output file path
   */
  private static generateOutputPath(
    inputPath: string,
    format: string,
    outputDir?: string
  ): string {
    const pathParts = inputPath.split('/');
    const fileName = pathParts.pop() || 'compressed';
    const nameWithoutExt = fileName.split('.')[0];
    const timestamp = Date.now();
    
    const outputFileName = `${nameWithoutExt}_compressed_${timestamp}.${format}`;
    
    if (outputDir) {
      return `${outputDir}/${outputFileName}`;
    }
    
    pathParts.push(outputFileName);
    return pathParts.join('/');
  }

  /**
   * Format file size for human display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}