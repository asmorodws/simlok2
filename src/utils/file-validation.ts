/**
 * File validation utilities for consistent file size and type validation across the application
 */

// File size constants
export const FILE_SIZE_LIMITS = {
  DEFAULT: 8, // 8MB default limit
  IMAGE: 8,   // 8MB for images
  DOCUMENT: 8, // 8MB for documents
} as const;

// Allowed file types and extensions
export const ALLOWED_FILE_TYPES = {
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  IMAGES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif'
  ],
  ALL: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif'
  ]
} as const;

export const ALLOWED_FILE_EXTENSIONS = {
  DOCUMENTS: ['.pdf', '.doc', '.docx'],
  IMAGES: ['.jpg', '.jpeg', '.png', '.gif'],
  ALL: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif']
} as const;

import { FileValidationOptions, FileValidationResult } from '@/types';

/**
 * Validates file size, type, and extension
 */
export function validateFile(
  file: File, 
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    maxSizeMB = FILE_SIZE_LIMITS.DEFAULT,
    allowedTypes = ALLOWED_FILE_TYPES.ALL,
    allowedExtensions = ALLOWED_FILE_EXTENSIONS.ALL
  } = options;

  // Check file size (convert MB to bytes)
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `Ukuran file terlalu besar. Maksimal ${maxSizeMB}MB`,
      size: file.size
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type as any)) {
    return {
      isValid: false,
      error: `Tipe file tidak didukung. Tipe yang diizinkan: ${allowedExtensions.join(', ')}`,
      type: file.type
    };
  }

  // Check file extension
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(fileExtension as any)) {
    return {
      isValid: false,
      error: `Ekstensi file tidak didukung. Ekstensi yang diizinkan: ${allowedExtensions.join(', ')}`,
      extension: fileExtension
    };
  }

  return {
    isValid: true,
    size: file.size,
    type: file.type,
    extension: fileExtension
  };
}

/**
 * Validates file for document uploads (PDF, DOC, DOCX)
 */
export function validateDocumentFile(file: File, maxSizeMB: number = FILE_SIZE_LIMITS.DOCUMENT): FileValidationResult {
  return validateFile(file, {
    maxSizeMB,
    allowedTypes: [...ALLOWED_FILE_TYPES.DOCUMENTS],
    allowedExtensions: [...ALLOWED_FILE_EXTENSIONS.DOCUMENTS]
  });
}

/**
 * Validates file for image uploads (JPG, JPEG, PNG, GIF)
 */
export function validateImageFile(file: File, maxSizeMB: number = FILE_SIZE_LIMITS.IMAGE): FileValidationResult {
  return validateFile(file, {
    maxSizeMB,
    allowedTypes: [...ALLOWED_FILE_TYPES.IMAGES],
    allowedExtensions: [...ALLOWED_FILE_EXTENSIONS.IMAGES]
  });
}

/**
 * Validates file for worker photo uploads (JPG, JPEG, PNG only)
 */
export function validateWorkerPhotoFile(file: File, maxSizeMB: number = FILE_SIZE_LIMITS.IMAGE): FileValidationResult {
  return validateFile(file, {
    maxSizeMB,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    allowedExtensions: ['.jpg', '.jpeg', '.png']
  });
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Convert MB to bytes
 */
export function mbToBytes(mb: number): number {
  return mb * 1024 * 1024;
}

/**
 * Convert bytes to MB
 */
export function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024);
}