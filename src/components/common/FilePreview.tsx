'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ fileUrl, fileName, onClose }) => {
  const isImage = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');
  };

  const isPdf = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension === 'pdf';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative max-w-4xl max-h-[90vh] w-full h-full bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {fileName}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 h-full overflow-auto">
          {isImage(fileName) ? (
            <div className="flex justify-center">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden text-center text-gray-500">
                <p>Could not load image</p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Open in new tab
                </a>
              </div>
            </div>
          ) : isPdf(fileName) ? (
            <div className="w-full h-full">
              <iframe
                src={fileUrl}
                className="w-full h-full border-0"
                title={fileName}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                {fileName}
              </p>
              <p className="text-gray-500 mb-4">
                This file type cannot be previewed
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
