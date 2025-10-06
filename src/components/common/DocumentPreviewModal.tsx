'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, ArrowTopRightOnSquareIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../ui/LoadingSpinner';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType?: string;
}

export default function DocumentPreviewModal({ 
  isOpen, 
  onClose, 
  fileUrl, 
  fileName, 
  fileType 
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
    }
  }, [isOpen, fileUrl]);

  if (!isOpen) return null;

  // Determine file type from URL or provided type
  const determineFileType = (url: string, type?: string): string => {
    if (type) return type.toLowerCase();
    
    const extension = url.split('.').pop()?.toLowerCase() || '';
    
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['doc', 'docx'].includes(extension)) return 'document';
    
    return 'unknown';
  };

  const detectedFileType = determineFileType(fileUrl, fileType);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  const renderPreviewContent = () => {
    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-2">!</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={handleOpenInNewTab}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Buka di Tab Baru
            </button>
          </div>
        </div>
      );
    }

    switch (detectedFileType) {
      case 'pdf':
        return (
          <div className="flex-1 relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <LoadingSpinner size="lg" className="mx-auto mb-4" />
                  <p className="text-gray-600">Memuat dokumen...</p>
                </div>
              </div>
            )}
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title={fileName}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError('Gagal memuat dokumen PDF');
              }}
            />
          </div>
        );

      case 'image':
        return (
          <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <LoadingSpinner size="lg" className="mx-auto mb-4" />
                  <p className="text-gray-600">Memuat gambar...</p>
                </div>
              </div>
            )}
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError('Gagal memuat gambar');
              }}
            />
          </div>
        );

      case 'document':
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-gray-600 mb-4">
                Dokumen Word tidak dapat ditampilkan langsung.
              </p>
              <div className="space-x-4">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Unduh Dokumen
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Buka di Tab Baru
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📎</div>
              <p className="text-gray-600 mb-4">
                File ini tidak dapat ditampilkan langsung.
              </p>
              <div className="space-x-4">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Unduh File
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Buka di Tab Baru
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-2">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl h-[95vh] flex flex-col">
          
          {/* Header - Fixed */}
          <div className="bg-white flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                {fileName}
              </h3>
              <span className="text-sm text-gray-500 capitalize">
                {detectedFileType}
              </span>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                title="Unduh"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleOpenInNewTab}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                title="Buka di Tab Baru"
              >
                <ArrowTopRightOnSquareIcon className="w-5 h-5" />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                title="Tutup"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="bg-white flex-1 overflow-hidden flex flex-col">
            {renderPreviewContent()}
          </div>


        </div>
      </div>
    </div>
  );
}
