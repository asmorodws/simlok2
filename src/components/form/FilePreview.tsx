'use client';

import { useState } from 'react';
import { DocumentIcon, PhotoIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface FilePreviewProps {
  url: string;
  filename: string;
  type?: string;
  size?: number;
  className?: string;
}

export default function FilePreview({ url, filename, type, size, className }: FilePreviewProps) {
  const [showPreview, setShowPreview] = useState(false);

  const getFileExtension = () => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const getFileIcon = () => {
    const extension = getFileExtension();
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
      return <PhotoIcon className="h-8 w-8 text-blue-500" />;
    }
    
    return <DocumentIcon className="h-8 w-8 text-gray-500" />;
  };

  const isImage = () => {
    const extension = getFileExtension();
    return ['jpg', 'jpeg', 'png', 'gif'].includes(extension);
  };

  const isPDF = () => {
    const extension = getFileExtension();
    return extension === 'pdf';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-4 bg-white ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getFileIcon()}
          <div>
            <div className="font-medium text-gray-900">{filename}</div>
            {size && (
              <div className="text-sm text-gray-500">{formatFileSize(size)}</div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {(isImage() || isPDF()) && (
            <button
              onClick={() => setShowPreview(true)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              title="Preview"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
          )}
          
          <button
            onClick={handleDownload}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            title="Download"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{filename}</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              {isImage() ? (
                <img
                  src={url}
                  alt={filename}
                  className="max-w-full h-auto"
                />
              ) : isPDF() ? (
                <iframe
                  src={url}
                  className="w-full h-96"
                  title={filename}
                />
              ) : (
                <div className="text-center py-8">
                  <DocumentIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Preview not available for this file type</p>
                  <button
                    onClick={handleDownload}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
