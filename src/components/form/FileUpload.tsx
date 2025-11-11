'use client';

import { useRef } from 'react';
import { DocumentIcon, XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { useFileUpload } from '@/hooks/useFileUpload';

interface FileUploadProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (url: string) => void;
  onFileChange?: (file: File | null) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
}

export default function FileUpload({
  id,
  name,
  value,
  onChange,
  onFileChange,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  multiple = false,
  maxSize = 8,
  required = false,
  disabled = false,
  className,
  label,
  description
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Use centralized file upload hook - replaces ~100 lines of duplicate logic
  const upload = useFileUpload({
    uploadEndpoint: '/api/upload',
    accept,
    maxSizeMB: maxSize,
    compressionOptions: {
      maxSizeKB: 500,
      quality: 0.8
    },
    ...(name && { additionalData: { fieldName: name } }),
    onUploadSuccess: (url) => {
      onChange?.(url);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    upload.handleFileSelect(e.target.files);
    if (onFileChange && e.target.files?.[0]) {
      onFileChange(e.target.files[0]);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    upload.removeFile();
    onChange?.('');
    onFileChange?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileName = () => {
    if (value) {
      return value.split('/').pop() || 'Uploaded file';
    }
    if (upload.currentFile) {
      return upload.currentFile.name;
    }
    return null;
  };

  const fileName = getFileName();

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}

      <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-md p-2">
        💡 <strong>Tip:</strong> Gambar akan otomatis dikompresi saat upload untuk menghemat ruang penyimpanan dan mempercepat upload.
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          upload.isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : disabled 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
        }`}
        onDragEnter={upload.handleDragEnter}
        onDragLeave={upload.handleDragLeave}
        onDragOver={upload.handleDragOver}
        onDrop={upload.handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          id={id}
          name={name}
          type="file"
          onChange={handleInputChange}
          accept={accept}
          multiple={multiple}
          required={required}
          disabled={disabled}
          className="hidden"
        />

        <div className="text-center">
          {upload.isCompressing ? (
            <>
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-blue-400 animate-pulse" />
              <p className="mt-2 text-sm text-gray-600">
                Mengkompresi file... {upload.uploadProgress}%
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${upload.uploadProgress}%` }}
                />
              </div>
            </>
          ) : upload.isUploading ? (
            <>
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-blue-400 animate-pulse" />
              <p className="mt-2 text-sm text-gray-600">
                Uploading... {upload.uploadProgress}%
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${upload.uploadProgress}%` }}
                />
              </div>
            </>
          ) : fileName ? (
            <>
              <DocumentIcon className="mx-auto h-12 w-12 text-green-500" />
              <p className="mt-2 text-sm text-gray-900 font-medium">{fileName}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={disabled}
                className="mt-2 inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Hapus file
              </button>
            </>
          ) : (
            <>
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4 flex text-sm text-gray-600 justify-center">
                <span className="font-semibold text-blue-600 hover:text-blue-700">
                  Upload file
                </span>
                <span className="pl-1">atau drag and drop</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {accept.replace(/\./g, '').toUpperCase()} hingga {maxSize}MB
              </p>
            </>
          )}
        </div>
      </div>

      {upload.compressionInfo && (
        <div className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-md p-2">
          {upload.compressionInfo}
        </div>
      )}

      {upload.error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {upload.error}
        </div>
      )}
    </div>
  );
}
