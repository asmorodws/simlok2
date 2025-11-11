/**
 * Universal File Compression Utility
 * Kompres berbagai jenis file (gambar, PDF, dokumen) sebelum upload ke server
 * 
 * Features:
 * - Image compression (JPEG, PNG, WebP)
 * - PDF compression
 * - Smart quality adjustment
 * - Maintains aspect ratio
 * - Client-side processing
 */

import { useState } from 'react';

export interface FileCompressionOptions {
  // Image options
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'jpeg' | 'png' | 'webp';
  
  // Universal options
  maxSizeKB?: number; // Target maximum size in KB
  preserveMetadata?: boolean;
  
  // PDF options
  compressPDF?: boolean;
  
  // Behavior
  skipIfSmall?: boolean; // Skip compression if file already small
  skipThresholdKB?: number; // Threshold in KB for skipping
}

export interface FileCompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // Percentage saved
  compressionApplied: boolean;
  format: string;
  width?: number;
  height?: number;
  duration?: number; // Processing time in ms
}

/**
 * Main File Compressor Class
 */
export class FileCompressor {
  // Default settings optimized for balance between quality and size
  private static readonly DEFAULT_OPTIONS: FileCompressionOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    outputFormat: 'jpeg',
    maxSizeKB: 800,
    preserveMetadata: false,
    compressPDF: true,
    skipIfSmall: true,
    skipThresholdKB: 100,
  };

  /**
   * Compress any file type (auto-detect and apply appropriate compression)
   */
  static async compressFile(
    file: File,
    options: FileCompressionOptions = {}
  ): Promise<FileCompressionResult> {
    const startTime = performance.now();
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const originalSize = file.size;

    // Skip compression if file is already small
    if (config.skipIfSmall && originalSize < config.skipThresholdKB! * 1024) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        compressionApplied: false,
        format: file.type,
        duration: performance.now() - startTime,
      };
    }

    // Determine file type and apply appropriate compression
    if (this.isImage(file)) {
      const result = await this.compressImage(file, config);
      return {
        ...result,
        duration: performance.now() - startTime,
      };
    } else if (this.isPDF(file)) {
      // For PDF, we'll just return as-is (PDF compression requires external libraries)
      // In production, consider using pdf-lib or similar for actual compression
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        compressionApplied: false,
        format: file.type,
        duration: performance.now() - startTime,
      };
    } else {
      // Other file types - return as-is
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        compressionApplied: false,
        format: file.type,
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Compress image file with smart quality adjustment
   */
  static async compressImage(
    file: File,
    options: FileCompressionOptions = {}
  ): Promise<FileCompressionResult> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const originalSize = file.size;

    // Create canvas for compression
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    // Load image
    const img = await this.loadImage(file);

    // Calculate new dimensions
    const { width, height } = this.calculateDimensions(
      img.width,
      img.height,
      config.maxWidth!,
      config.maxHeight!
    );

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Enable high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw image
    ctx.drawImage(img, 0, 0, width, height);

    // Determine output format
    let outputFormat = config.outputFormat!;
    
    // Auto-convert PNG to JPEG if no transparency is needed (better compression)
    if (file.type === 'image/png' && !config.preserveMetadata) {
      const hasTransparency = await this.hasTransparency(img);
      if (!hasTransparency) {
        outputFormat = 'jpeg';
      }
    }

    // Compress with quality adjustment
    let quality = config.quality!;
    let compressedBlob: Blob;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      compressedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob!),
          `image/${outputFormat}`,
          quality
        );
      });

      attempts++;

      // If still too large and we haven't reached minimum quality, reduce quality
      if (
        compressedBlob.size > config.maxSizeKB! * 1024 &&
        quality > 0.3 &&
        attempts < maxAttempts
      ) {
        quality -= 0.05;
      } else {
        break;
      }
    } while (quality > 0.3);

    // Create new file
    const compressedFile = new File(
      [compressedBlob],
      this.generateFileName(file.name, outputFormat),
      { type: `image/${outputFormat}` }
    );

    const compressedSize = compressedFile.size;
    const compressionRatio = originalSize > 0 
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
      : 0;

    return {
      file: compressedFile,
      originalSize,
      compressedSize,
      compressionRatio,
      compressionApplied: compressedSize < originalSize,
      format: outputFormat,
      width,
      height,
    };
  }

  /**
   * Compress worker photo (optimized for passport-style photos)
   */
  static async compressWorkerPhoto(
    file: File,
    options: Partial<FileCompressionOptions> = {}
  ): Promise<FileCompressionResult> {
    return this.compressImage(file, {
      maxWidth: 800,
      maxHeight: 1000,
      quality: 0.85,
      outputFormat: 'jpeg',
      maxSizeKB: 500,
      ...options,
    });
  }

  /**
   * Compress HSSE/SIKA/SIMJA document (can be image or PDF)
   */
  static async compressDocument(
    file: File,
    options: Partial<FileCompressionOptions> = {}
  ): Promise<FileCompressionResult> {
    if (this.isImage(file)) {
      return this.compressImage(file, {
        maxWidth: 2480, // A4 size at 300 DPI
        maxHeight: 3508,
        quality: 0.90, // Higher quality for documents
        outputFormat: 'jpeg',
        maxSizeKB: 1500, // Allow larger size for documents
        ...options,
      });
    }
    
    // For PDFs and other documents, return as-is
    return this.compressFile(file, options);
  }

  /**
   * Batch compress multiple files
   */
  static async compressMultiple(
    files: File[],
    options: FileCompressionOptions = {}
  ): Promise<FileCompressionResult[]> {
    const results: FileCompressionResult[] = [];
    
    for (const file of files) {
      if (!file) continue;
      try {
        const result = await FileCompressor.compressFile(file, options);
        results.push(result);
      } catch (error) {
        console.error(`Error compressing ${file.name}:`, error);
        // Return original file if compression fails
        results.push({
          file,
          originalSize: file.size,
          compressedSize: file.size,
          compressionRatio: 0,
          compressionApplied: false,
          format: file.type,
        });
      }
    }
    
    return results;
  }

  // ========== HELPER METHODS ==========

  /**
   * Load image from file
   */
  private static loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src); // Clean up memory
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate optimal dimensions maintaining aspect ratio
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // Scale down if larger than max dimensions
    if (width > maxWidth || height > maxHeight) {
      const aspectRatio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
    }

    return { 
      width: Math.round(width), 
      height: Math.round(height) 
    };
  }

  /**
   * Check if image has transparency (alpha channel)
   */
  private static async hasTransparency(img: HTMLImageElement): Promise<boolean> {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    ctx.drawImage(img, 0, 0);
    
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Check alpha channel (every 4th byte)
      for (let i = 3; i < data.length; i += 4) {
        const alphaValue = data[i];
        if (alphaValue !== undefined && alphaValue < 255) {
          return true; // Found transparent pixel
        }
      }
      
      return false;
    } catch (error) {
      // If we can't access image data (CORS), assume no transparency
      return false;
    }
  }

  /**
   * Generate filename with new extension
   */
  private static generateFileName(originalName: string, format: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    return `${nameWithoutExt}_compressed_${timestamp}.${format}`;
  }

  /**
   * Check if file is an image
   */
  private static isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Check if file is a PDF
   */
  private static isPDF(file: File): boolean {
    return file.type === 'application/pdf';
  }

  /**
   * Get compression statistics for display
   */
  static getCompressionStats(result: FileCompressionResult): string {
    const { originalSize, compressedSize, compressionRatio, compressionApplied } = result;
    
    if (!compressionApplied) {
      return `Ukuran: ${this.formatBytes(originalSize)} (tidak dikompres)`;
    }
    
    return `${this.formatBytes(originalSize)} → ${this.formatBytes(compressedSize)} (hemat ${compressionRatio}%)`;
  }

  /**
   * Format bytes to human-readable size
   */
  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Validate file for worker photo
   * @param file - File to validate
   * @returns Validation result with isValid and optional error message
   */
  static validateWorkerPhoto(file: File): { isValid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Hanya file gambar (JPG, JPEG, PNG) yang diperbolehkan untuk foto pekerja'
      };
    }

    // Check file size (max 8MB before compression)
    const maxSize = 8 * 1024 * 1024; // 8MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Ukuran file terlalu besar. Maksimal 8MB'
      };
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      return {
        isValid: false,
        error: 'Ekstensi file tidak valid. Gunakan .jpg, .jpeg, atau .png'
      };
    }

    return { isValid: true };
  }
}

/**
 * React Hook for file compression
 * Usage: const { compressFile, isCompressing } = useFileCompression();
 */
export function useFileCompression() {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);

  const compressFile = async (
    file: File,
    options?: FileCompressionOptions
  ): Promise<FileCompressionResult> => {
    setIsCompressing(true);
    setProgress(0);

    try {
      // Simulate progress (since compression is synchronous)
      setProgress(50);
      
      const result = await FileCompressor.compressFile(file, options);
      
      setProgress(100);
      
      return result;
    } finally {
      setIsCompressing(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const compressMultiple = async (
    files: File[],
    options?: FileCompressionOptions
  ): Promise<FileCompressionResult[]> => {
    setIsCompressing(true);
    setProgress(0);

    try {
      const results: FileCompressionResult[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const result = await FileCompressor.compressFile(file, options);
        results.push(result);
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      
      return results;
    } finally {
      setIsCompressing(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  return {
    compressFile,
    compressMultiple,
    isCompressing,
    progress,
  };
}
