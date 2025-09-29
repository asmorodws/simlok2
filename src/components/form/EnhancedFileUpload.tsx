'use client';

import { useState, useRef } from 'react';
import { DocumentIcon, XMarkIcon, CloudArrowUpIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { ImageCompressor } from '@/utils/image-compression';
import { useToast } from '@/hooks/useToast';

interface EnhancedFileUploadProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onFileChange?: (file: File | null) => void;
  uploadType: 'worker-photo' | 'document' | 'other';
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
  workerName?: string; // For worker photos
}

export default function EnhancedFileUpload({
  id,
  name,
  value,
  onChange,
  onFileChange,
  uploadType,
  multiple = false,
  required = false,
  disabled = false,
  className,
  label,
  description,
  workerName
}: EnhancedFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useToast();

  // Get accept types based on upload type
  const getAcceptTypes = () => {
    switch (uploadType) {
      case 'worker-photo':
        return '.jpg,.jpeg,.png';
      case 'document':
        return '.pdf,.doc,.docx,.jpg,.jpeg,.png';
      default:
        return '.pdf,.doc,.docx,.jpg,.jpeg,.png';
    }
  };

  // Validate file based on type
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    switch (uploadType) {
      case 'worker-photo':
        return ImageCompressor.validateWorkerPhoto(file);
      case 'document':
        return ImageCompressor.validateDocumentFile(file);
      default:
        return { isValid: false, error: 'Tipe upload tidak valid' };
    }
  };

  // Upload file with compression for photos
  const uploadFile = async (file: File): Promise<string> => {
    let fileToUpload = file;
    
    // Compress worker photos
    if (uploadType === 'worker-photo') {
      try {
        const compressionResult = await ImageCompressor.compressWorkerPhoto(file, {
          maxWidth: 800,
          maxHeight: 600,
          quality: 0.85,
          maxSizeKB: 500
        });
        
        fileToUpload = compressionResult.file;
        
        // Show compression info
        // const compressionText = `Foto dikompres ${compressionResult.compressionRatio}% (${formatFileSize(compressionResult.originalSize)} → ${formatFileSize(compressionResult.compressedSize)})`;
        // setCompressionInfo(compressionText);
        // showSuccess('Kompresi Berhasil', compressionText);
        
      } catch (compressionError) {
        console.error('Compression error:', compressionError);
        // showError('Warning', 'Gagal mengompres foto, menggunakan file asli');
      }
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('file', fileToUpload);
    
    // Add specific fields based on upload type
    if (uploadType === 'worker-photo' && workerName) {
      formData.append('workerName', workerName);
    }
    
    if (name) {
      formData.append('fieldName', name);
    }

    // Choose upload endpoint
    const uploadEndpoint = uploadType === 'worker-photo' 
      ? '/api/upload/worker-photo' 
      : '/api/upload';

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
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;

    setError(null);
    setCompressionInfo(null);

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'File tidak valid');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const fileUrl = await uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Notify parent components
      if (onChange) {
        onChange(fileUrl);
      }
      if (onFileChange) {
        onFileChange(file);
      }

      // Show success message
      const fileType = uploadType === 'worker-photo' ? 'foto pekerja' : 'dokumen';
      showSuccess('Upload Berhasil', `${fileType} berhasil diunggah`);

    } catch (err: any) {
      setError(err.message || 'Gagal mengunggah file');
      showError('Upload Gagal', err.message || 'Gagal mengunggah file');
    } finally {
      setUploading(false);
      
      // Reset progress after delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleRemove = () => {
    if (onChange) {
      onChange('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
    setCompressionInfo(null);
  };

  const getFileName = (): string => {
    if (!value) return '';
    return value.split('/').pop() || '';
  };

  const getFileIcon = () => {
    if (uploadType === 'worker-photo') {
      return <PhotoIcon className="mx-auto h-12 w-12 text-blue-500" />;
    }
    return <DocumentIcon className="mx-auto h-12 w-12 text-blue-500" />;
  };

  const getUploadText = () => {
    if (uploadType === 'worker-photo') {
      return {
        title: 'Upload Foto Pekerja',
        subtitle: 'Drag & drop foto atau klik untuk browse',
        formats: 'JPG, JPEG, PNG (max 10MB, akan dikompres otomatis)'
      };
    }
    return {
      title: 'Upload Dokumen',
      subtitle: 'Drag & drop file atau klik untuk browse',
      formats: 'PDF, DOC, DOCX, JPG, PNG (max 8MB)'
    };
  };

  const uploadText = getUploadText();

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors
          ${dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : error 
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          id={id}
          name={name}
          type="file"
          className="hidden"
          accept={getAcceptTypes()}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {uploading ? (
          <div className="text-center">
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-blue-500 animate-bounce" />
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900">
                Mengunggah{uploadType === 'worker-photo' ? ' dan mengompres' : ''} file...
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">{uploadProgress}%</div>
            </div>
          </div>
        ) : value ? (
          <div className="text-center">
            {getFileIcon()}
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900">{getFileName()}</div>
              {compressionInfo && (
                <div className="text-xs text-green-600 mt-1">{compressionInfo}</div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="mt-2 inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <XMarkIcon className="h-3 w-3 mr-1" />
                Hapus
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {getFileIcon()}
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900">{uploadText.title}</div>
              <div className="text-xs text-gray-500 mt-1">{uploadText.subtitle}</div>
              <div className="text-xs text-gray-400 mt-1">{uploadText.formats}</div>
            </div>
          </div>
        )}
      </div>

      {description && !error && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}