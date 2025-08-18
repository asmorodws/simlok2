'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';

interface SimlokPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  submissionName: string;
  nomorSimlok?: string;
}

export default function SimlokPdfModal({ 
  isOpen, 
  onClose, 
  submissionId, 
  submissionName,
  nomorSimlok
}: SimlokPdfModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');

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

  // Generate PDF URL and reset states when modal opens
  useEffect(() => {
    if (isOpen && submissionId) {
      setLoading(true);
      setError(null);
      
      // Generate PDF URL with timestamp to avoid caching issues
      const timestamp = new Date().getTime();
      const url = `/api/submissions/${submissionId}?format=pdf&t=${timestamp}`;
      setPdfUrl(url);
    }
  }, [isOpen, submissionId]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      
      if (!response.ok) {
        throw new Error('Gagal mendownload PDF');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Generate filename
      const filename = nomorSimlok 
        ? `SIMLOK_${nomorSimlok.replace(/[/\\]/g, '_')}.pdf`
        : `SIMLOK_${submissionName.replace(/[/\\]/g, '_')}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
      setError('Gagal mendownload PDF SIMLOK');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const renderPdfContent = () => {
    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Gagal Memuat PDF</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-4">
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Coba Lagi
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 relative bg-gray-100">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium">Memuat dokumen SIMLOK...</p>
              <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar</p>
            </div>
          </div>
        )}
        
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0"
          title={`SIMLOK - ${submissionName}`}
          onLoad={() => {
            setLoading(false);
            setError(null);
          }}
          onError={() => {
            setLoading(false);
            setError('Gagal memuat dokumen PDF SIMLOK. Pastikan semua data submission sudah lengkap.');
          }}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-2">
        <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col">
          
          {/* Header - Fixed with SIMLOK branding */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between p-4 rounded-t-lg flex-shrink-0">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 rounded-lg p-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Dokumen SIMLOK
                </h3>
                <p className="text-sm text-blue-100">
                  {nomorSimlok ? `No: ${nomorSimlok}` : submissionName}
                </p>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              {/* <button
                onClick={handlePrint}
                disabled={Boolean(loading || error)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 transition-colors rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                title="Print PDF"
              >
                <PrinterIcon className="w-5 h-5" />
              </button> */}
              
              <button
                onClick={handleDownload}
                disabled={Boolean(loading || error)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 transition-colors rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download PDF"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
              
              <div className="w-px h-6 bg-white/20 mx-2"></div>
              
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 transition-colors rounded-full"
                title="Tutup"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content - PDF Viewer */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {renderPdfContent()}
          </div>

          {/* Footer - Status and actions */}
          <div className="bg-gray-50 flex justify-between items-center p-4 border-t border-gray-200 flex-shrink-0 rounded-b-lg">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                📄 Dokumen SIMLOK - PT. Pertamina (Persero)
              </div>
              {/* {!loading && !error && (
                <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  ✅ Siap untuk dicetak atau diunduh
                </div>
              )} */}
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                Tip: Gunakan Ctrl+F untuk pencarian dalam dokumen
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-white bg-gray-600 border border-gray-600 rounded-md hover:bg-gray-700 hover:border-gray-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
