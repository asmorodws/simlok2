/**
 * Upload Helpers with Automatic Compression
 * Helper functions untuk upload file ke server dengan kompresi otomatis
 */

import { FileCompressor, FileCompressionResult } from './file-compressor';

export interface UploadOptions {
  // Compression options
  compress?: boolean;
  compressionMode?: 'auto' | 'worker-photo' | 'document' | 'none';
  maxSizeKB?: number;
  quality?: number;
  
  // Upload options
  endpoint?: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  fieldName?: string;
  additionalData?: Record<string, any>;
  
  // Callbacks
  onProgress?: (progress: number) => void;
  onCompressionStart?: () => void;
  onCompressionComplete?: (result: FileCompressionResult) => void;
  onUploadStart?: () => void;
  onUploadComplete?: (response: any) => void;
  onError?: (error: string) => void;
}

export interface UploadResult {
  success: boolean;
  data?: any;
  error?: string;
  compressionResult?: FileCompressionResult;
  uploadDuration?: number;
  totalDuration?: number;
}

/**
 * Upload single file with automatic compression
 */
export async function uploadFileWithCompression(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const startTime = performance.now();
  
  const {
    compress = true,
    compressionMode = 'auto',
    maxSizeKB,
    quality,
    endpoint = '/api/upload',
    method = 'POST',
    headers = {},
    fieldName = 'file',
    additionalData = {},
    onProgress,
    onCompressionStart,
    onCompressionComplete,
    onUploadStart,
    onUploadComplete,
    onError,
  } = options;

  try {
    let fileToUpload = file;
    let compressionResult: FileCompressionResult | undefined;

    // Step 1: Compress file if enabled
    if (compress && compressionMode !== 'none') {
      onCompressionStart?.();
      onProgress?.(10);

      // Apply compression based on mode
      switch (compressionMode) {
        case 'worker-photo':
          compressionResult = await FileCompressor.compressWorkerPhoto(file, {
            ...(maxSizeKB !== undefined && { maxSizeKB }),
            ...(quality !== undefined && { quality }),
          });
          break;
        case 'document':
          compressionResult = await FileCompressor.compressDocument(file, {
            ...(maxSizeKB !== undefined && { maxSizeKB }),
            ...(quality !== undefined && { quality }),
          });
          break;
        case 'auto':
        default:
          compressionResult = await FileCompressor.compressFile(file, {
            ...(maxSizeKB !== undefined && { maxSizeKB }),
            ...(quality !== undefined && { quality }),
          });
          break;
      }

      fileToUpload = compressionResult.file;
      onCompressionComplete?.(compressionResult);
      onProgress?.(40);
    }

    // Step 2: Upload file
    onUploadStart?.();
    onProgress?.(50);

    const uploadStartTime = performance.now();
    const formData = new FormData();
    formData.append(fieldName, fileToUpload);

    // Add additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    });

    const response = await fetch(endpoint, {
      method,
      headers,
      body: formData,
    });

    onProgress?.(90);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const uploadDuration = performance.now() - uploadStartTime;
    const totalDuration = performance.now() - startTime;

    onProgress?.(100);
    onUploadComplete?.(data);

    return {
      success: true,
      data,
      ...(compressionResult && { compressionResult }),
      uploadDuration,
      totalDuration,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    onError?.(errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Upload multiple files with compression
 */
export async function uploadMultipleFilesWithCompression(
  files: File[],
  options: UploadOptions = {}
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;

    const fileProgress = (i / totalFiles) * 100;
    
    const result = await uploadFileWithCompression(file, {
      ...options,
      onProgress: (progress) => {
        const overallProgress = fileProgress + (progress / totalFiles);
        options.onProgress?.(overallProgress);
      },
    });

    results.push(result);
  }

  return results;
}

/**
 * Upload worker photo with optimized settings
 */
export async function uploadWorkerPhoto(
  file: File,
  workerId: string,
  options: Partial<UploadOptions> = {}
): Promise<UploadResult> {
  return uploadFileWithCompression(file, {
    compress: true,
    compressionMode: 'worker-photo',
    endpoint: '/api/upload/worker-photo',
    fieldName: 'photo',
    additionalData: { workerId },
    ...options,
  });
}

/**
 * Upload HSSE/SIKA/SIMJA/JSA document with optimized settings
 */
export async function uploadDocument(
  file: File,
  documentType: 'hsse' | 'sika' | 'simja' | 'jsa',
  submissionId: string,
  options: Partial<UploadOptions> = {}
): Promise<UploadResult> {
  return uploadFileWithCompression(file, {
    compress: true,
    compressionMode: 'document',
    endpoint: '/api/upload/document',
    fieldName: 'document',
    additionalData: { documentType, submissionId },
    ...options,
  });
}

/**
 * Create FormData with compressed file
 */
export async function createCompressedFormData(
  file: File,
  fieldName: string = 'file',
  additionalFields: Record<string, any> = {},
  compressionMode: 'auto' | 'worker-photo' | 'document' = 'auto'
): Promise<{ formData: FormData; compressionResult: FileCompressionResult }> {
  
  // Compress file
  let compressionResult: FileCompressionResult;
  
  switch (compressionMode) {
    case 'worker-photo':
      compressionResult = await FileCompressor.compressWorkerPhoto(file);
      break;
    case 'document':
      compressionResult = await FileCompressor.compressDocument(file);
      break;
    case 'auto':
    default:
      compressionResult = await FileCompressor.compressFile(file);
      break;
  }

  // Create FormData
  const formData = new FormData();
  formData.append(fieldName, compressionResult.file);

  // Add additional fields
  Object.entries(additionalFields).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value.toString());
    }
  });

  return { formData, compressionResult };
}

/**
 * Validate and compress file before upload
 */
export async function validateAndCompressFile(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
    compressionMode?: 'auto' | 'worker-photo' | 'document' | 'none';
  } = {}
): Promise<{ valid: boolean; error?: string; compressedFile?: File; compressionResult?: FileCompressionResult }> {
  
  const {
    maxSizeMB = 10,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    compressionMode = 'auto',
  } = options;

  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipe file tidak diizinkan. Gunakan: ${allowedTypes.join(', ')}`,
    };
  }

  // Validate file size before compression
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Ukuran file terlalu besar. Maksimal ${maxSizeMB}MB`,
    };
  }

  // Compress file if it's an image
  if (file.type.startsWith('image/') && compressionMode !== 'none') {
    try {
      let compressionResult: FileCompressionResult;

      switch (compressionMode) {
        case 'worker-photo':
          compressionResult = await FileCompressor.compressWorkerPhoto(file);
          break;
        case 'document':
          compressionResult = await FileCompressor.compressDocument(file);
          break;
        case 'auto':
        default:
          compressionResult = await FileCompressor.compressFile(file);
          break;
      }

      return {
        valid: true,
        compressedFile: compressionResult.file,
        compressionResult,
      };
    } catch (error) {
      console.error('Compression failed:', error);
      // Return original file if compression fails
      return {
        valid: true,
        compressedFile: file,
      };
    }
  }

  // For non-image files, return as-is
  return {
    valid: true,
    compressedFile: file,
  };
}

/**
 * Format upload result for display
 */
export function formatUploadResult(result: UploadResult): string {
  if (!result.success) {
    return `❌ Upload gagal: ${result.error}`;
  }

  let message = '✅ Upload berhasil';

  if (result.compressionResult && result.compressionResult.compressionApplied) {
    const { compressionRatio } = result.compressionResult;
    message += ` (hemat ${compressionRatio}%)`;
  }

  if (result.totalDuration) {
    message += ` dalam ${Math.round(result.totalDuration)}ms`;
  }

  return message;
}

/**
 * Get upload statistics
 */
export function getUploadStats(results: UploadResult[]): {
  totalFiles: number;
  successful: number;
  failed: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalSaved: number;
  averageCompressionRatio: number;
} {
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;

  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  let totalCompressionRatio = 0;
  let filesWithCompression = 0;

  results.forEach(result => {
    if (result.compressionResult) {
      totalOriginalSize += result.compressionResult.originalSize;
      totalCompressedSize += result.compressionResult.compressedSize;
      totalCompressionRatio += result.compressionResult.compressionRatio;
      filesWithCompression++;
    }
  });

  return {
    totalFiles: results.length,
    successful,
    failed,
    totalOriginalSize,
    totalCompressedSize,
    totalSaved: totalOriginalSize - totalCompressedSize,
    averageCompressionRatio: filesWithCompression > 0 
      ? Math.round(totalCompressionRatio / filesWithCompression) 
      : 0,
  };
}
