/**
 * Image Compression Utility
 * Kompres gambar untuk foto pekerja dengan tetap mempertahankan kualitas visual
 */

import { CompressionOptions, CompressionResult } from '@/types';

export class ImageCompressor {
  /**
   * Compress image file for worker photos
   */
  static async compressWorkerPhoto(
    file: File, 
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const defaultOptions: CompressionOptions = {
      maxWidth: 800,
      maxHeight: 600,
      quality: 0.85, // 85% quality untuk menjaga ketajaman
      outputFormat: 'jpeg',
      maxSizeKB: 500 // Max 500KB untuk foto pekerja
    };

    const config = { ...defaultOptions, ...options };
    const originalSize = file.size;

    // Create canvas untuk kompresi
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

    // Enable image smoothing untuk kualitas yang lebih baik
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw and compress
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob dengan kualitas yang disesuaikan
    let quality = config.quality!;
    let compressedBlob: Blob;

    do {
      compressedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob!),
          `image/${config.outputFormat}`,
          quality
        );
      });

      // Jika masih terlalu besar, kurangi kualitas
      if (compressedBlob.size > config.maxSizeKB! * 1024 && quality > 0.3) {
        quality -= 0.1;
      } else {
        break;
      }
    } while (quality > 0.3);

    // Create new file
    const compressedFile = new File(
      [compressedBlob], 
      this.generateFileName(file.name, config.outputFormat!),
      { type: `image/${config.outputFormat}` }
    );

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      compressionRatio: Math.round((1 - compressedFile.size / originalSize) * 100),
      format: config.outputFormat!
    };
  }

  /**
   * Load image from file
   */
  private static loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
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
    let { width, height } = { width: originalWidth, height: originalHeight };

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  /**
   * Generate filename with new extension
   */
  private static generateFileName(originalName: string, format: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}_compressed.${format}`;
  }

  /**
   * Validate if file is a valid image for worker photo
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

  /**
   * Validate document files (for SIKA/SIMJA/Support Documents)
   * Only PDF files are allowed for support documents
   */
  static validateDocumentFile(file: File): { isValid: boolean; error?: string } {
    // Only allow PDF for support documents
    const allowedTypes = ['application/pdf'];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'File harus berupa dokumen PDF'
      };
    }

    // Check file size (max 8MB for PDF)
    const maxSize = 8 * 1024 * 1024; // 8MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Ukuran file terlalu besar. Maksimal 8MB'
      };
    }

    const allowedExtensions = ['.pdf'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      return {
        isValid: false,
        error: 'Ekstensi file harus .pdf'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate HSSE worker document (can be image or PDF)
   */
  static validateHSSEWorkerDocument(file: File): { isValid: boolean; error?: string } {
    // Allow both images and PDF for HSSE worker documents
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'File harus berupa gambar (JPG, JPEG, PNG)'
      };
    }

    // Check file size (max 8MB)
    const maxSize = 8 * 1024 * 1024; // 8MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Ukuran file terlalu besar. Maksimal 8MB'
      };
    }

    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      return {
        isValid: false,
        error: 'Ekstensi file harus .jpg, .jpeg, atau .png'
      };
    }

    return { isValid: true };
  }
}