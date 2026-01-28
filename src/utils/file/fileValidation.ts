/**
 * File Validation Utilities for Document Uploads
 * Comprehensive validation to prevent errors in submission forms
 */

import { formatFileSize } from '@/lib/helpers/utils';

// ===============================
// Constants
// ===============================

export const FILE_LIMITS = {
  // Size limits (in bytes)
  MAX_IMAGE_SIZE: 8 * 1024 * 1024, // 8MB for images
  MAX_PDF_SIZE: 10 * 1024 * 1024,  // 10MB for PDFs
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB for general documents
  
  // Recommended sizes (in bytes)
  RECOMMENDED_IMAGE_SIZE: 2 * 1024 * 1024, // 2MB
  RECOMMENDED_PDF_SIZE: 5 * 1024 * 1024,   // 5MB
  
  // Image dimensions
  MIN_IMAGE_WIDTH: 200,
  MIN_IMAGE_HEIGHT: 200,
  MAX_IMAGE_WIDTH: 4096,
  MAX_IMAGE_HEIGHT: 4096,
  
  // File name
  MAX_FILENAME_LENGTH: 255,
} as const;

export const ALLOWED_MIME_TYPES = {
  IMAGE: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
  ],
  PDF: [
    'application/pdf',
  ],
  DOCUMENT: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ],
} as const;

export const ALLOWED_EXTENSIONS = {
  IMAGE: ['.jpg', '.jpeg', '.png', '.webp'],
  PDF: ['.pdf'],
  DOCUMENT: ['.pdf', '.jpg', '.jpeg', '.png'],
} as const;

// ===============================
// Validation Result Types
// ===============================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  details?: {
    name: string;
    size: number;
    type: string;
    extension: string;
    isImage: boolean;
    isPDF: boolean;
    dimensions?: { width: number; height: number };
  };
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  extension: string;
  isImage: boolean;
  isPDF: boolean;
}

// ===============================
// Helper Functions
// ===============================

/**
 * Get file extension from filename
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot !== -1 ? fileName.slice(lastDot).toLowerCase() : '';
}

/**
 * Extract file information
 */
export function getFileInfo(file: File): FileInfo {
  const extension = getFileExtension(file.name);
  const isImage = file.type.startsWith('image/');
  const isPDF = file.type === 'application/pdf' || extension === '.pdf';
  
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    extension,
    isImage,
    isPDF,
  };
}

/**
 * Helper to build validation result with optional warnings
 */
function buildSuccessResult(
  details: FileInfo | (FileInfo & { dimensions: { width: number; height: number } }),
  warnings: string[]
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    details,
  };
  if (warnings.length > 0) {
    result.warnings = warnings;
  }
  return result;
}

/**
 * Validate file name
 */
export function validateFileName(fileName: string): ValidationResult {
  // Check length
  if (fileName.length > FILE_LIMITS.MAX_FILENAME_LENGTH) {
    return {
      isValid: false,
      error: `Nama file terlalu panjang (maksimal ${FILE_LIMITS.MAX_FILENAME_LENGTH} karakter)`,
    };
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"|?*\x00-\x1F]/g;
  if (invalidChars.test(fileName)) {
    return {
      isValid: false,
      error: 'Nama file mengandung karakter yang tidak diizinkan',
    };
  }
  
  // Check for extension
  const extension = getFileExtension(fileName);
  if (!extension) {
    return {
      isValid: false,
      error: 'File harus memiliki ekstensi',
    };
  }
  
  return { isValid: true };
}

/**
 * Get image dimensions from File
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File bukan gambar'));
      return;
    }
    
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gagal memuat gambar'));
    };
    
    img.src = url;
  });
}

/**
 * Validate PDF file structure
 */
export async function validatePDFStructure(file: File): Promise<ValidationResult> {
  try {
    // Check if file is not empty
    if (file.size < 100) {
      return {
        isValid: false,
        error: 'File PDF terlalu kecil atau rusak',
      };
    }
    
    // Read first 1024 bytes to check PDF signature and basic structure
    const headerSize = Math.min(1024, file.size);
    const buffer = await file.slice(0, headerSize).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const header = String.fromCharCode(...bytes);
    
    // 1. Check PDF signature at start
    if (!header.startsWith('%PDF-')) {
      return {
        isValid: false,
        error: 'File bukan PDF yang valid (signature tidak ditemukan)',
      };
    }
    
    // 2. Extract and validate PDF version
    const versionMatch = header.match(/%PDF-(\d+\.\d+)/);
    if (!versionMatch || !versionMatch[1]) {
      return {
        isValid: false,
        error: 'Versi PDF tidak valid',
      };
    }
    
    const version = parseFloat(versionMatch[1]);
    if (version < 1.0 || version > 2.0) {
      return {
        isValid: false,
        error: `Versi PDF tidak didukung (${versionMatch[1]}). Gunakan PDF versi 1.0 - 2.0`,
      };
    }
    
    // 3. Check for EOF marker at the end of file
    const footerSize = Math.min(1024, file.size);
    const footerBuffer = await file.slice(file.size - footerSize).arrayBuffer();
    const footerBytes = new Uint8Array(footerBuffer);
    const footer = String.fromCharCode(...footerBytes);
    
    if (!footer.includes('%%EOF')) {
      return {
        isValid: false,
        error: 'File PDF rusak atau tidak lengkap (EOF marker tidak ditemukan)',
      };
    }
    
    // 4. Check for essential PDF objects in header
    const hasObjects = header.includes('obj') || footer.includes('obj');
    if (!hasObjects && file.size > 1024) {
      return {
        isValid: false,
        error: 'Struktur PDF tidak valid (objek PDF tidak ditemukan)',
      };
    }
    
    // 5. CRITICAL: Parse PDF using pdf-lib (MANDATORY - most reliable check)
    // This catches PDFs with invalid object references that browsers might render partially
    // We MUST use pdf-lib validation - iframe test is too permissive
    console.log(`[PDF Validation] Starting pdf-lib validation for: ${file.name}`);
    
    try {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await file.arrayBuffer();
      
      console.log(`[PDF Validation] Loaded file into memory (${arrayBuffer.byteLength} bytes)`);
      
      // Capture console warnings to detect corruption
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (...args: any[]) => {
        const msg = args.map(a => String(a)).join(' ');
        warnings.push(msg);
        originalWarn.apply(console, args);
      };
      
      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer, {
          ignoreEncryption: true,
          updateMetadata: false,
        });
        
        // Restore console.warn
        console.warn = originalWarn;
        
        // Check for corruption warnings from pdf-lib
        const hasCorruptionWarning = warnings.some(w => 
          w.includes('Invalid object ref') ||
          w.includes('Trying to parse invalid object') ||
          w.includes('Failed to parse') ||
          w.includes('corrupt') ||
          w.includes('missing') ||
          w.includes('invalid')
        );
        
        if (hasCorruptionWarning) {
          console.error('[PDF Validation] ❌ Corruption detected in pdf-lib warnings');
          console.error('[PDF Validation] Warnings:', warnings);
          return {
            isValid: false,
            error: 'File PDF tidak bisa dibuka atau rusak. Periksa kembali file Anda dan coba unggah lagi.',
          };
        }
        
        // Additional validation: ensure PDF has at least some pages
        const pageCount = pdfDoc.getPageCount();
        console.log(`[PDF Validation] ✅ PDF is valid with ${pageCount} page(s), no corruption warnings`);
        
        if (pageCount === 0) {
          console.error('[PDF Validation] ❌ PDF has no pages');
          return {
            isValid: false,
            error: 'File PDF tidak memiliki halaman. File mungkin rusak.',
          };
        }
        
      } catch (pdfLibError) {
        // Restore console.warn in case of error
        console.warn = originalWarn;
        
        console.error('[PDF Validation] ❌ pdf-lib parsing FAILED:', pdfLibError);
        
        // Check for specific error patterns
        const errorMsg = pdfLibError instanceof Error ? pdfLibError.message : String(pdfLibError);
        console.error('[PDF Validation] Error message:', errorMsg);
        
        if (errorMsg.includes('Invalid object ref') || 
            errorMsg.includes('Trying to parse invalid object') ||
            errorMsg.includes('Failed to parse') ||
            errorMsg.includes('Does not contain') ||
            errorMsg.includes('Missing') ||
            errorMsg.includes('PDFDocument')) {
          return {
            isValid: false,
            error: 'File PDF tidak bisa dibuka atau rusak. Periksa kembali file Anda dan coba unggah lagi.',
          };
        }
        
        // Generic parse error - still invalid
        return {
          isValid: false,
          error: 'File PDF tidak dapat dibaca. File mungkin rusak atau menggunakan format yang tidak didukung.',
        };
      }
    } catch (importError) {
      // pdf-lib import failed - this is a critical error, we cannot validate without it
      console.error('[PDF Validation] ❌ CRITICAL: pdf-lib import failed:', importError);
      return {
        isValid: false,
        error: 'Sistem validasi PDF tidak tersedia. Silakan refresh halaman dan coba lagi.',
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Gagal memvalidasi struktur PDF',
    };
  }
}

// ===============================
// Main Validation Functions
// ===============================

/**
 * Validate worker photo upload
 */
export async function validateWorkerPhoto(file: File): Promise<ValidationResult> {
  const warnings: string[] = [];
  
  // 1. Validate file name
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.isValid) {
    return nameValidation;
  }
  
  // 2. Check file type
  const fileInfo = getFileInfo(file);
  if (!fileInfo.isImage) {
    return {
      isValid: false,
      error: 'File harus berupa gambar (JPG, JPEG, PNG, atau WebP)',
    };
  }
  
  // 3. Check MIME type
  if (!ALLOWED_MIME_TYPES.IMAGE.includes(file.type as any)) {
    return {
      isValid: false,
      error: `Format file tidak didukung. Gunakan: ${ALLOWED_MIME_TYPES.IMAGE.join(', ')}`,
    };
  }
  
  // 4. Check file size
  if (file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
    return {
      isValid: false,
      error: `Ukuran file terlalu besar (maksimal ${formatFileSize(FILE_LIMITS.MAX_IMAGE_SIZE)})`,
    };
  }
  
  if (file.size > FILE_LIMITS.RECOMMENDED_IMAGE_SIZE) {
    warnings.push(`Ukuran file cukup besar (${formatFileSize(file.size)}). Disarankan di bawah ${formatFileSize(FILE_LIMITS.RECOMMENDED_IMAGE_SIZE)}`);
  }
  
  // 5. Check if file is empty
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File kosong atau rusak',
    };
  }
  
  // 6. Validate image dimensions
  try {
    const dimensions = await getImageDimensions(file);
    
    if (dimensions.width < FILE_LIMITS.MIN_IMAGE_WIDTH || dimensions.height < FILE_LIMITS.MIN_IMAGE_HEIGHT) {
      return {
        isValid: false,
        error: `Resolusi gambar terlalu kecil (minimal ${FILE_LIMITS.MIN_IMAGE_WIDTH}x${FILE_LIMITS.MIN_IMAGE_HEIGHT}px)`,
        details: { ...fileInfo, dimensions },
      };
    }
    
    if (dimensions.width > FILE_LIMITS.MAX_IMAGE_WIDTH || dimensions.height > FILE_LIMITS.MAX_IMAGE_HEIGHT) {
      warnings.push(`Resolusi gambar sangat besar (${dimensions.width}x${dimensions.height}px). File akan dikompres.`);
    }
    
    return buildSuccessResult({ ...fileInfo, dimensions }, warnings);
  } catch (error) {
    return {
      isValid: false,
      error: 'Gagal memuat gambar. File mungkin rusak atau format tidak didukung.',
    };
  }
}

/**
 * Validate HSSE worker document (must be image)
 */
export async function validateHSSEWorkerDocument(file: File): Promise<ValidationResult> {
  const warnings: string[] = [];
  
  // 1. Validate file name
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.isValid) {
    return nameValidation;
  }
  
  // 2. HSSE worker MUST be image (not PDF)
  const fileInfo = getFileInfo(file);
  if (!fileInfo.isImage) {
    return {
      isValid: false,
      error: 'Dokumen HSSE pekerja HARUS berupa foto/gambar (JPG, JPEG, PNG). PDF tidak diperbolehkan.',
    };
  }
  
  // 3. Check MIME type
  if (!ALLOWED_MIME_TYPES.IMAGE.includes(file.type as any)) {
    return {
      isValid: false,
      error: `Format file tidak didukung. Gunakan: JPG, JPEG, atau PNG`,
    };
  }
  
  // 4. Check file size
  if (file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
    return {
      isValid: false,
      error: `Ukuran file terlalu besar (maksimal ${formatFileSize(FILE_LIMITS.MAX_IMAGE_SIZE)})`,
    };
  }
  
  if (file.size > FILE_LIMITS.RECOMMENDED_IMAGE_SIZE) {
    warnings.push(`Ukuran file cukup besar (${formatFileSize(file.size)}). Disarankan di bawah ${formatFileSize(FILE_LIMITS.RECOMMENDED_IMAGE_SIZE)}`);
  }
  
  // 5. Check if file is empty
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File kosong atau rusak',
    };
  }
  
  // 6. Validate image dimensions
  try {
    const dimensions = await getImageDimensions(file);
    
    if (dimensions.width < FILE_LIMITS.MIN_IMAGE_WIDTH || dimensions.height < FILE_LIMITS.MIN_IMAGE_HEIGHT) {
      return {
        isValid: false,
        error: `Resolusi gambar terlalu kecil (minimal ${FILE_LIMITS.MIN_IMAGE_WIDTH}x${FILE_LIMITS.MIN_IMAGE_HEIGHT}px)`,
        details: { ...fileInfo, dimensions },
      };
    }
    
    if (dimensions.width > FILE_LIMITS.MAX_IMAGE_WIDTH || dimensions.height > FILE_LIMITS.MAX_IMAGE_HEIGHT) {
      warnings.push(`Resolusi gambar sangat besar (${dimensions.width}x${dimensions.height}px). File akan dikompres.`);
    }
    
    return buildSuccessResult({ ...fileInfo, dimensions }, warnings);
  } catch (error) {
    return {
      isValid: false,
      error: 'Gagal memuat gambar. File mungkin rusak atau format tidak didukung.',
    };
  }
}

/**
 * Validate PDF document upload
 */
export async function validatePDFDocument(file: File): Promise<ValidationResult> {
  const warnings: string[] = [];
  
  // 1. Validate file name
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.isValid) {
    return nameValidation;
  }
  
  // 2. Check file type
  const fileInfo = getFileInfo(file);
  if (!fileInfo.isPDF) {
    return {
      isValid: false,
      error: 'File harus berupa PDF',
    };
  }
  
  // 3. Check MIME type
  if (!ALLOWED_MIME_TYPES.PDF.includes(file.type as any) && fileInfo.extension !== '.pdf') {
    return {
      isValid: false,
      error: 'Format file tidak valid. Harus PDF.',
    };
  }
  
  // 4. Check file size
  if (file.size > FILE_LIMITS.MAX_PDF_SIZE) {
    return {
      isValid: false,
      error: `Ukuran file terlalu besar (maksimal ${formatFileSize(FILE_LIMITS.MAX_PDF_SIZE)})`,
    };
  }
  
  if (file.size > FILE_LIMITS.RECOMMENDED_PDF_SIZE) {
    warnings.push(`Ukuran file cukup besar (${formatFileSize(file.size)}). Disarankan di bawah ${formatFileSize(FILE_LIMITS.RECOMMENDED_PDF_SIZE)}`);
  }
  
  // 5. Check if file is empty
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File kosong atau rusak',
    };
  }
  
  // 6. Validate PDF structure
  const pdfValidation = await validatePDFStructure(file);
  if (!pdfValidation.isValid) {
    return pdfValidation;
  }
  
  return buildSuccessResult(fileInfo, warnings);
}

/**
 * Validate general document (can be PDF or Image)
 */
export async function validateDocument(file: File): Promise<ValidationResult> {
  const warnings: string[] = [];
  
  // 1. Validate file name
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.isValid) {
    return nameValidation;
  }
  
  // 2. Check file type
  const fileInfo = getFileInfo(file);
  if (!fileInfo.isPDF && !fileInfo.isImage) {
    return {
      isValid: false,
      error: 'File harus berupa PDF atau gambar (JPG, JPEG, PNG)',
    };
  }
  
  // 3. Check MIME type
  if (!ALLOWED_MIME_TYPES.DOCUMENT.includes(file.type as any)) {
    return {
      isValid: false,
      error: `Format file tidak didukung. Gunakan: PDF, JPG, JPEG, atau PNG`,
    };
  }
  
  // 4. Check file size
  const maxSize = fileInfo.isPDF ? FILE_LIMITS.MAX_PDF_SIZE : FILE_LIMITS.MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `Ukuran file terlalu besar (maksimal ${formatFileSize(maxSize)})`,
    };
  }
  
  const recommendedSize = fileInfo.isPDF ? FILE_LIMITS.RECOMMENDED_PDF_SIZE : FILE_LIMITS.RECOMMENDED_IMAGE_SIZE;
  if (file.size > recommendedSize) {
    warnings.push(`Ukuran file cukup besar (${formatFileSize(file.size)})`);
  }
  
  // 5. Check if file is empty
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File kosong atau rusak',
    };
  }
  
  // 6. Type-specific validation
  if (fileInfo.isPDF) {
    const pdfValidation = await validatePDFStructure(file);
    if (!pdfValidation.isValid) {
      return pdfValidation;
    }
  } else if (fileInfo.isImage) {
    try {
      const dimensions = await getImageDimensions(file);
      
      if (dimensions.width < FILE_LIMITS.MIN_IMAGE_WIDTH || dimensions.height < FILE_LIMITS.MIN_IMAGE_HEIGHT) {
        return {
          isValid: false,
          error: `Resolusi gambar terlalu kecil (minimal ${FILE_LIMITS.MIN_IMAGE_WIDTH}x${FILE_LIMITS.MIN_IMAGE_HEIGHT}px)`,
          details: { ...fileInfo, dimensions },
        };
      }
      
      return buildSuccessResult({ ...fileInfo, dimensions }, warnings);
    } catch (error) {
      return {
        isValid: false,
        error: 'Gagal memuat gambar. File mungkin rusak.',
      };
    }
  }
  
  return buildSuccessResult(fileInfo, warnings);
}

/**
 * Validate multiple files at once
 */
export async function validateMultipleFiles(
  files: File[],
  validator: (file: File) => Promise<ValidationResult>
): Promise<{ allValid: boolean; results: ValidationResult[]; errors: string[] }> {
  const results: ValidationResult[] = [];
  const errors: string[] = [];
  
  for (const file of files) {
    const result = await validator(file);
    results.push(result);
    
    if (!result.isValid && result.error) {
      errors.push(`${file.name}: ${result.error}`);
    }
  }
  
  return {
    allValid: results.every(r => r.isValid),
    results,
    errors,
  };
}
