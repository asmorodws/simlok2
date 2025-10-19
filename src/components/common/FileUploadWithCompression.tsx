/**
 * File Upload Component with Automatic Compression
 * Automatically compresses files before upload to save bandwidth and storage
 * 
 * Usage:
 * <FileUploadWithCompression
 *   onFileSelected={(file) => handleUpload(file)}
 *   compressionOptions={{ maxSizeKB: 500 }}
 *   accept="image/*"
 * />
 */

'use client';

import React, { useRef, useState } from 'react';
import { FileCompressor, FileCompressionResult } from '@/utils/file-compressor';
import { CheckCircleIcon, ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface FileUploadWithCompressionProps {
  onFileSelected: (file: File, compressionResult?: FileCompressionResult) => void | Promise<void>;
  onCompressionStart?: () => void;
  onCompressionComplete?: (result: FileCompressionResult) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSizeKB?: number;
  disabled?: boolean;
  className?: string;
  compressionOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeKB?: number;
  };
  showCompressionStats?: boolean;
  buttonText?: string;
  compressionMode?: 'auto' | 'worker-photo' | 'document' | 'none';
}

export const FileUploadWithCompression: React.FC<FileUploadWithCompressionProps> = ({
  onFileSelected,
  onCompressionStart,
  onCompressionComplete,
  onError,
  accept = 'image/*,.pdf',
  maxSizeKB,
  disabled = false,
  className = '',
  compressionOptions = {},
  showCompressionStats = true,
  buttonText = 'Pilih File',
  compressionMode = 'auto',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState<FileCompressionResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setSelectedFileName(file.name);
    setCompressionResult(null);

    try {
      // Check if compression should be skipped
      if (compressionMode === 'none') {
        await onFileSelected(file);
        return;
      }

      // Start compression
      setIsCompressing(true);
      onCompressionStart?.();

      let result: FileCompressionResult;

      // Apply compression based on mode
      switch (compressionMode) {
        case 'worker-photo':
          result = await FileCompressor.compressWorkerPhoto(file, compressionOptions);
          break;
        case 'document':
          result = await FileCompressor.compressDocument(file, compressionOptions);
          break;
        case 'auto':
        default:
          result = await FileCompressor.compressFile(file, {
            ...(maxSizeKB !== undefined && { maxSizeKB }),
            ...compressionOptions,
          });
          break;
      }

      setCompressionResult(result);
      onCompressionComplete?.(result);

      // Call the parent handler with compressed file
      await onFileSelected(result.file, result);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal mengompres file';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Compression error:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const getCompressionStatusIcon = () => {
    if (isCompressing) {
      return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    if (compressionResult?.compressionApplied) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    if (error) {
      return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
    }
    return null;
  };

  return (
    <div className={`file-upload-with-compression ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isCompressing}
      />

      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || isCompressing}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      >
        {getCompressionStatusIcon()}
        {isCompressing ? 'Mengompres...' : buttonText}
      </button>

      {selectedFileName && (
        <div className="mt-2 text-sm text-gray-600">
          File: {selectedFileName}
        </div>
      )}

      {showCompressionStats && compressionResult && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-800">
            <div className="font-semibold mb-1">✓ Kompresi Berhasil</div>
            <div className="text-xs space-y-1">
              <div>Ukuran awal: {FileCompressor.formatBytes(compressionResult.originalSize)}</div>
              <div>Ukuran akhir: {FileCompressor.formatBytes(compressionResult.compressedSize)}</div>
              {compressionResult.compressionRatio > 0 && (
                <div className="font-semibold text-green-700">
                  Hemat: {compressionResult.compressionRatio}%
                </div>
              )}
              {compressionResult.width && compressionResult.height && (
                <div>Dimensi: {compressionResult.width} x {compressionResult.height}px</div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-800">
            <div className="font-semibold mb-1">✗ Error</div>
            <div className="text-xs">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadWithCompression;
