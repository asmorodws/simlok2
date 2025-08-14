'use client';

import { useState, useRef } from 'react';
import { DocumentIcon, XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (url: string) => void;
  onFileChange?: (file: File | null) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
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
  maxSize = 5, // 5MB default
  required = false,
  disabled = false,
  className,
  label,
  description
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Check file type
    const acceptedTypes = accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return type === fileExtension;
      }
      return file.type.match(type);
    });

    if (!isValidType) {
      return `File type not supported. Accepted types: ${accept}`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add field name to help categorize the file
    if (name) {
      formData.append('fieldName', name);
    }

    const response = await fetch('/api/upload', {
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
    setError(null);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
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

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    if (onChange) {
      onChange('');
    }
    if (onFileChange) {
      onFileChange(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
  };

  const getFileName = () => {
    if (value) {
      return value.split('/').pop() || 'Uploaded file';
    }
    return null;
  };

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

      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : disabled 
            ? 'border-gray-200 bg-gray-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${
          !disabled ? 'cursor-pointer' : 'cursor-not-allowed'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          id={id}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          required={required}
          disabled={disabled}
          onChange={handleInputChange}
          className="hidden"
        />

        {uploading ? (
          <div className="text-center">
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-blue-500 animate-pulse" />
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900">Uploading...</div>
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
            <DocumentIcon className="mx-auto h-12 w-12 text-green-500" />
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900">{getFileName()}</div>
              <div className="text-xs text-gray-500 mt-1">File uploaded successfully</div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="mt-2 inline-flex items-center px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900">
                {dragActive ? 'Drop file here' : 'Click to upload or drag and drop'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {accept} up to {maxSize}MB
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}
    </div>
  );
}
