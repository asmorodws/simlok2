'use client';

import { useState } from 'react';
import { ArrowTopRightOnSquareIcon, ArrowDownTrayIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/components/ui/loading';
import BaseModal from '@/components/ui/modal/BaseModal';
import Button from '@/components/ui/button/Button';

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

  const determineFileType = (url: string, type?: string): string => {
    if (type) return type.toLowerCase();
    const extension = url.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
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

  const handleOpenInNewTab = () => window.open(fileUrl, '_blank');

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <DocumentIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleDownload} variant="primary">Download File</Button>
          </div>
        </div>
      );
    }

    if (detectedFileType === 'pdf') {
      return (
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-gray-600">Memuat dokumen...</p>
            </div>
          )}
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={fileName}
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError('Gagal memuat dokumen PDF'); }}
          />
        </div>
      );
    }

    if (detectedFileType === 'image') {
      return (
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-gray-600">Memuat gambar...</p>
            </div>
          )}
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError('Gagal memuat gambar'); }}
          />
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <DocumentIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Preview tidak tersedia</p>
          <p className="text-sm text-gray-500 mb-4">{fileName}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleDownload} variant="primary">
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />Download
            </Button>
            <Button onClick={handleOpenInNewTab} variant="secondary">
              <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />Buka di Tab Baru
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const footer = (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600 truncate mr-4">{fileName}</span>
      <div className="flex gap-2">
        <Button onClick={handleDownload} variant="secondary" size="sm">
          <ArrowDownTrayIcon className="w-4 h-4 mr-1" />Download
        </Button>
        <Button onClick={handleOpenInNewTab} variant="secondary" size="sm">
          <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1" />Buka
        </Button>
      </div>
    </div>
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Preview Dokumen" footer={footer} size="xl" className="max-h-[90vh]" contentClassName="min-h-[60vh]">
      {renderContent()}
    </BaseModal>
  );
}
