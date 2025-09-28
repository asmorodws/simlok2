/**
 * File Validation Service
 * Comprehensive file type validation with security checks
 */

import { readFile } from 'fs/promises';

interface FileValidationResult {
  isValid: boolean;
  mimeType: string;
  actualExtension: string;
  size: number;
  error?: string;
  securityChecks: {
    hasValidSignature: boolean;
    isSafeExtension: boolean;
    hasNoMaliciousContent: boolean;
  };
}

interface ValidationOptions {
  allowedTypes: string[];
  allowedExtensions: string[];
  maxSize: number;
  checkMagicBytes: boolean;
  scanForMalware: boolean;
}

export class FileValidationService {
  // File signatures (magic bytes) for validation
  private static readonly FILE_SIGNATURES = {
    'image/jpeg': [
      [0xFF, 0xD8, 0xFF],
    ],
    'image/png': [
      [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    ],
    'application/pdf': [
      [0x25, 0x50, 0x44, 0x46], // %PDF
    ],
    'application/msword': [
      [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // .doc
    ],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
      [0x50, 0x4B, 0x03, 0x04], // .docx (ZIP-based)
      [0x50, 0x4B, 0x05, 0x06], // .docx (empty ZIP)
      [0x50, 0x4B, 0x07, 0x08], // .docx (spanned ZIP)
    ],
  };

  // Allowed file types for SIMLOK system
  private static readonly DEFAULT_ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  private static readonly DEFAULT_ALLOWED_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png', 
    '.pdf',
    '.doc',
    '.docx',
  ];

  // Dangerous file extensions that should never be allowed
  private static readonly DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
    '.jar', '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi',
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1',
  ];

  // Malicious patterns to check for
  private static readonly MALICIOUS_PATTERNS = [
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /<script[^>]*>/gi,
    /<iframe[^>]*>/gi,
    /eval\(/gi,
    /document\.write/gi,
  ];

  /**
   * Comprehensive file validation
   */
  static async validateFile(
    filePath: string,
    originalName: string,
    options: Partial<ValidationOptions> = {}
  ): Promise<FileValidationResult> {
    const config: ValidationOptions = {
      allowedTypes: options.allowedTypes || this.DEFAULT_ALLOWED_TYPES,
      allowedExtensions: options.allowedExtensions || this.DEFAULT_ALLOWED_EXTENSIONS,
      maxSize: options.maxSize || 10 * 1024 * 1024, // 10MB default
      checkMagicBytes: options.checkMagicBytes ?? true,
      scanForMalware: options.scanForMalware ?? true,
    };

    try {
      const fileBuffer = await readFile(filePath);
      const fileSize = fileBuffer.length;
      
      // Extract extension from original filename
      const extension = this.getFileExtension(originalName);
      
      // Basic size validation
      if (fileSize > config.maxSize) {
        return {
          isValid: false,
          mimeType: '',
          actualExtension: extension,
          size: fileSize,
          error: `File size ${this.formatFileSize(fileSize)} exceeds maximum allowed size ${this.formatFileSize(config.maxSize)}`,
          securityChecks: {
            hasValidSignature: false,
            isSafeExtension: false,
            hasNoMaliciousContent: false,
          },
        };
      }

      // Check for dangerous extensions
      if (this.DANGEROUS_EXTENSIONS.includes(extension.toLowerCase())) {
        return {
          isValid: false,
          mimeType: '',
          actualExtension: extension,
          size: fileSize,
          error: `File extension '${extension}' is not allowed for security reasons`,
          securityChecks: {
            hasValidSignature: false,
            isSafeExtension: false,
            hasNoMaliciousContent: false,
          },
        };
      }

      // Extension validation
      const isSafeExtension = config.allowedExtensions.includes(extension.toLowerCase());
      if (!isSafeExtension) {
        return {
          isValid: false,
          mimeType: '',
          actualExtension: extension,
          size: fileSize,
          error: `File extension '${extension}' is not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`,
          securityChecks: {
            hasValidSignature: false,
            isSafeExtension: false,
            hasNoMaliciousContent: false,
          },
        };
      }

      // Detect actual MIME type from file signature
      const actualMimeType = this.detectMimeType(fileBuffer);
      
      // Magic bytes validation
      let hasValidSignature = true;
      if (config.checkMagicBytes && actualMimeType) {
        hasValidSignature = this.validateFileSignature(fileBuffer, actualMimeType);
        if (!hasValidSignature) {
          return {
            isValid: false,
            mimeType: actualMimeType,
            actualExtension: extension,
            size: fileSize,
            error: 'File signature does not match file extension (possible file tampering)',
            securityChecks: {
              hasValidSignature: false,
              isSafeExtension: isSafeExtension,
              hasNoMaliciousContent: false,
            },
          };
        }
      }

      // MIME type validation
      const mimeType = actualMimeType || this.getMimeTypeFromExtension(extension);
      if (!config.allowedTypes.includes(mimeType)) {
        return {
          isValid: false,
          mimeType,
          actualExtension: extension,
          size: fileSize,
          error: `File type '${mimeType}' is not allowed. Allowed types: ${config.allowedTypes.join(', ')}`,
          securityChecks: {
            hasValidSignature,
            isSafeExtension,
            hasNoMaliciousContent: false,
          },
        };
      }

      // Malware/malicious content scan
      let hasNoMaliciousContent = true;
      if (config.scanForMalware) {
        hasNoMaliciousContent = this.scanForMaliciousContent(fileBuffer);
        if (!hasNoMaliciousContent) {
          return {
            isValid: false,
            mimeType,
            actualExtension: extension,
            size: fileSize,
            error: 'File contains potentially malicious content',
            securityChecks: {
              hasValidSignature,
              isSafeExtension,
              hasNoMaliciousContent: false,
            },
          };
        }
      }

      return {
        isValid: true,
        mimeType,
        actualExtension: extension,
        size: fileSize,
        securityChecks: {
          hasValidSignature,
          isSafeExtension,
          hasNoMaliciousContent,
        },
      };

    } catch (error) {
      return {
        isValid: false,
        mimeType: '',
        actualExtension: '',
        size: 0,
        error: error instanceof Error ? error.message : 'File validation failed',
        securityChecks: {
          hasValidSignature: false,
          isSafeExtension: false,
          hasNoMaliciousContent: false,
        },
      };
    }
  }

  /**
   * Detect MIME type from file signature (magic bytes)
   */
  private static detectMimeType(buffer: Buffer): string {
    for (const [mimeType, signatures] of Object.entries(this.FILE_SIGNATURES)) {
      for (const signature of signatures) {
        if (this.checkSignature(buffer, signature)) {
          return mimeType;
        }
      }
    }
    return '';
  }

  /**
   * Check if buffer starts with given signature
   */
  private static checkSignature(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) return false;
    
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) return false;
    }
    return true;
  }

  /**
   * Validate file signature against expected MIME type
   */
  private static validateFileSignature(buffer: Buffer, mimeType: string): boolean {
    const signatures = this.FILE_SIGNATURES[mimeType as keyof typeof this.FILE_SIGNATURES];
    if (!signatures) return true; // Allow if no signature defined
    
    return signatures.some(signature => this.checkSignature(buffer, signature));
  }

  /**
   * Get file extension from filename
   */
  private static getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
  }

  /**
   * Get MIME type from file extension
   */
  private static getMimeTypeFromExtension(extension: string): string {
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    
    return mimeMap[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Scan for malicious content patterns
   */
  private static scanForMaliciousContent(buffer: Buffer): boolean {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 8192)); // Check first 8KB
    
    return !this.MALICIOUS_PATTERNS.some(pattern => pattern.test(content));
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate specific file types for SIMLOK categories
   */
  static validateSIMLOKFile(
    filePath: string,
    originalName: string,
    category: 'sika' | 'simja' | 'id_card' | 'other'
  ): Promise<FileValidationResult> {
    let allowedTypes: string[];
    let allowedExtensions: string[];

    switch (category) {
      case 'id_card':
        // ID Card should be images only
        allowedTypes = ['image/jpeg', 'image/png'];
        allowedExtensions = ['.jpg', '.jpeg', '.png'];
        break;
        
      case 'sika':
      case 'simja':
        // Documents can be images or PDFs
        allowedTypes = [
          'image/jpeg',
          'image/png', 
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
        break;
        
      default:
        allowedTypes = this.DEFAULT_ALLOWED_TYPES;
        allowedExtensions = this.DEFAULT_ALLOWED_EXTENSIONS;
    }

    return this.validateFile(filePath, originalName, {
      allowedTypes,
      allowedExtensions,
      maxSize: 10 * 1024 * 1024, // 10MB
      checkMagicBytes: true,
      scanForMalware: true,
    });
  }
}