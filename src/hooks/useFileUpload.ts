/**
 * useFileUpload Hook
 * Centralized file upload logic with validation, compression, and progress tracking
 * 
 * Consolidates duplicate logic from:
 * - FileUpload.tsx
 * - EnhancedFileUpload.tsx
 * - FileUploadWithCompression.tsx
 * 
 * Features:
 * - File validation (size, type)
 * - Drag & drop handling
 * - Upload progress simulation
 * - Client-side compression (images)
 * - Error handling
 * 
 * @example
 * const upload = useFileUpload({
 *   uploadEndpoint: '/api/upload',
 *   accept: '.jpg,.png',
 *   maxSizeMB: 8,
 *   compressionOptions: { maxSizeKB: 500 }
 * });
 * 
 * // In component:
 * <input onChange={upload.handleFileSelect} />
 */

import { useState, useRef, useCallback } from 'react';
import { FileCompressor, FileCompressionOptions, FileCompressionResult } from '@/utils/file-compressor';

// ==================== TYPES ====================

export interface FileUploadOptions {
  /** API endpoint for file upload */
  uploadEndpoint: string;
  
  /** Accepted file types (e.g., ".jpg,.png,.pdf") */
  accept?: string;
  
  /** Maximum file size in MB */
  maxSizeMB?: number;
  
  /** Compression options for images */
  compressionOptions?: FileCompressionOptions;
  
  /** Additional form data to send with upload */
  additionalData?: Record<string, string>;
  
  /** Callback after successful upload */
  onUploadSuccess?: (url: string) => void;
  
  /** Callback after compression */
  onCompressionComplete?: (result: FileCompressionResult) => void;
  
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface FileUploadState {
  /** Current uploaded file URL */
  fileUrl: string | null;
  
  /** Currently selected file */
  currentFile: File | null;
  
  /** Upload in progress */
  isUploading: boolean;
  
  /** Compression in progress */
  isCompressing: boolean;
  
  /** Upload progress (0-100) */
  uploadProgress: number;
  
  /** Error message */
  error: string | null;
  
  /** Compression information */
  compressionInfo: string | null;
  
  /** Drag active state */
  isDragging: boolean;
}

export interface FileUploadHandlers {
  /** Handle file selection from input */
  handleFileSelect: (files: FileList | null) => Promise<void>;
  
  /** Handle drag enter */
  handleDragEnter: (e: React.DragEvent) => void;
  
  /** Handle drag leave */
  handleDragLeave: (e: React.DragEvent) => void;
  
  /** Handle drag over */
  handleDragOver: (e: React.DragEvent) => void;
  
  /** Handle drop */
  handleDrop: (e: React.DragEvent) => void;
  
  /** Remove current file */
  removeFile: () => void;
  
  /** Reset all state */
  reset: () => void;
}

export interface UseFileUploadReturn extends FileUploadState, FileUploadHandlers {}

// ==================== HOOK ====================

export function useFileUpload(options: FileUploadOptions): UseFileUploadReturn {
  const {
    uploadEndpoint,
    accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
    maxSizeMB = 8,
    compressionOptions,
    additionalData,
    onUploadSuccess,
    onCompressionComplete,
    onError,
  } = options;

  // ========== STATE ==========
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Progress interval ref for cleanup
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ========== VALIDATION ==========
  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `Ukuran file terlalu besar. Maksimal ${maxSizeMB}MB`;
    }

    // Check file type based on accept prop
    const acceptedTypes = accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return type === fileExtension;
      }
      return file.type.match(type);
    });

    if (!isValidType) {
      return `Tipe file tidak didukung. Tipe yang diizinkan: ${accept}`;
    }

    return null;
  }, [accept, maxSizeMB]);

  // ========== UPLOAD ==========
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional data if provided
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    return data.url;
  }, [uploadEndpoint, additionalData]);

  // ========== COMPRESSION ==========
  const compressFileIfNeeded = useCallback(async (file: File): Promise<File> => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
      return file;
    }

    const IMAGE_THRESHOLD = 500 * 1024; // 500KB
    if (file.size <= IMAGE_THRESHOLD && !compressionOptions) {
      return file;
    }

    setIsCompressing(true);
    setUploadProgress(0);

    console.log(`🔄 Compressing ${file.name} (${FileCompressor.formatBytes(file.size)})...`);
    
    try {
      const result = await FileCompressor.compressFile(file, {
        maxSizeKB: 500,
        quality: 0.8,
        ...compressionOptions,
      });
      
      if (result.compressionApplied && result.compressedSize < file.size) {
        const info = `✅ Compressed: ${FileCompressor.formatBytes(file.size)} → ${FileCompressor.formatBytes(result.compressedSize)} (saved ${result.compressionRatio.toFixed(1)}%)`;
        setCompressionInfo(info);
        console.log(info);
        
        onCompressionComplete?.(result);
        
        setUploadProgress(50);
        return result.file;
      }
      
      return file;
    } finally {
      setIsCompressing(false);
    }
  }, [compressionOptions, onCompressionComplete]);

  // ========== HANDLERS ==========
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    let file = files[0];
    if (!file) return;
    
    setError(null);
    setCompressionInfo(null);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    try {
      // Compress if needed
      file = await compressFileIfNeeded(file);
      
      // Upload
      setIsUploading(true);
      setCurrentFile(file);

      // Simulate progress for better UX (50-90% for upload)
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 100);

      const url = await uploadFile(file);
      
      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      setUploadProgress(100);
      setFileUrl(url);
      
      onUploadSuccess?.(url);

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(errorMessage);
      onError?.(errorMessage);
      setIsUploading(false);
      setIsCompressing(false);
      setUploadProgress(0);
      
      // Clear progress interval on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }, [validateFile, compressFileIfNeeded, uploadFile, onUploadSuccess, onError]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  const removeFile = useCallback(() => {
    setFileUrl(null);
    setCurrentFile(null);
    setError(null);
    setCompressionInfo(null);
  }, []);

  const reset = useCallback(() => {
    setFileUrl(null);
    setCurrentFile(null);
    setIsUploading(false);
    setIsCompressing(false);
    setUploadProgress(0);
    setError(null);
    setCompressionInfo(null);
    setIsDragging(false);
    
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // ========== CLEANUP ==========
  // Clear progress interval on unmount
  useRef(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  });

  // ========== RETURN ==========
  return {
    // State
    fileUrl,
    currentFile,
    isUploading,
    isCompressing,
    uploadProgress,
    error,
    compressionInfo,
    isDragging,
    
    // Handlers
    handleFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    removeFile,
    reset,
  };
}
