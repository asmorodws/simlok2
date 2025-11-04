/**
 * File URL utilities for handling legacy and new file URL formats
 */

import { toJakartaISOString } from '@/lib/timezone';

export class FileUrlHelper {
  /**
   * Convert legacy file URL to new categorized format
   * Legacy: /api/files/userId/filename
   * New: /api/files/userId/category/filename
   */
  static convertLegacyUrl(url: string, fieldName?: string): string {
    if (!url) return url;

    // Check if it's already in new format (has category)
    const urlParts = url.split('/');
    if (urlParts.length >= 6) {
      return url; // Already in new format
    }

    // Extract userId and filename from legacy format
    const userId = urlParts[3];
    const filename = urlParts[4];

    if (!userId || !filename) {
      return url; // Invalid URL, return as is
    }

    // Determine category from field name or filename
    const category = this.getCategoryFromField(fieldName, filename);

    return `/api/files/${userId}/${category}/${filename}`;
  }

  /**
   * Determine file category from field name or filename
   */
  static getCategoryFromField(fieldName?: string, filename?: string): string {
    if (fieldName) {
      const lowerField = fieldName.toLowerCase();
      if (lowerField.includes('sika')) return 'sika';
      if (lowerField.includes('simja')) return 'simja';
      if (lowerField.includes('hsse')) return 'hsse';
      if (lowerField.includes('foto') || lowerField.includes('photo') || lowerField.includes('pekerja') || lowerField.includes('worker')) return 'worker-photo';
    }
    
    if (filename) {
      const lowerName = filename.toLowerCase();
      if (lowerName.includes('sika')) return 'sika';
      if (lowerName.includes('simja')) return 'simja';
      if (lowerName.includes('hsse')) return 'hsse';
      if (lowerName.includes('ktp') || lowerName.includes('id') || lowerName.includes('identitas')) return 'id_card';
      if (lowerName.includes('foto') || lowerName.includes('photo') || lowerName.includes('pekerja') || lowerName.includes('worker')) return 'worker-photo';
    }
    
    return 'document';
  }

  /**
   * Get display filename from full filename
   */
  static getDisplayFilename(filename: string): string {
    if (!filename) return '';
    
    // Remove timestamp and random string prefix if present
    // Format: CATEGORY_timestamp_random_originalname.ext
    const parts = filename.split('_');
    if (parts.length >= 4 && parts[0]?.match(/^(SIKA|SIMJA|DOC)$/i)) {
      // Remove first 3 parts (category, timestamp, random)
      return parts.slice(3).join('_');
    }
    
    return filename;
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file is an image
   */
  static isImage(filename: string): boolean {
    const extension = this.getFileExtension(filename);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
  }

  /**
   * Check if file is a PDF
   */
  static isPDF(filename: string): boolean {
    const extension = this.getFileExtension(filename);
    return extension === 'pdf';
  }

  /**
   * Check if file is a document
   */
  static isDocument(filename: string): boolean {
    const extension = this.getFileExtension(filename);
    return ['doc', 'docx', 'pdf', 'txt', 'rtf'].includes(extension);
  }

  /**
   * Get MIME type from filename
   */
  static getMimeType(filename: string): string {
    const extension = this.getFileExtension(filename);
    
    const mimeTypes: { [key: string]: string } = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      txt: 'text/plain',
      rtf: 'application/rtf'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Generate download filename for better user experience
   */
  static generateDownloadFilename(originalUrl: string, category: string, customName?: string): string {
    if (customName) {
      return customName;
    }

    const filename = originalUrl.split('/').pop() || 'download';
    const extension = this.getFileExtension(filename);
    
    const categoryNames = {
      sika: 'Dokumen_SIKA',
      simja: 'Dokumen_SIMJA',
      id_card: 'ID_Card',
      other: 'Dokumen'
    };

    const prefix = categoryNames[category as keyof typeof categoryNames] || 'Dokumen';
  const jakartaNow = toJakartaISOString(new Date());
  const timestamp = jakartaNow ? jakartaNow.split('T')[0] : new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    return `${prefix}_${timestamp}.${extension}`;
  }
}

// Export for easier imports
export const fileUrlHelper = FileUrlHelper;
