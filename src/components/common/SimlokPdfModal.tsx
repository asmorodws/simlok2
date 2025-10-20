'use client';

import { useEffect, useMemo, useState } from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../ui/LoadingSpinner';

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
  nomorSimlok,
}: SimlokPdfModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualFilename, setActualFilename] = useState<string>('');

  // 🎯 KEY FIX: Generate API URL to point iframe DIRECTLY to endpoint
  // This allows browser's "Save as" to read Content-Disposition header!
  const pdfApiUrl = useMemo(() => {
    if (!submissionId || !isOpen) return null;
    const timestamp = Date.now();
    return `/api/submissions/${encodeURIComponent(submissionId)}?format=pdf&t=${timestamp}`;
  }, [submissionId, isOpen]);

  // Esc key + body scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Fetch filename from server for display (optional)
  useEffect(() => {
    if (!isOpen || !submissionId) {
      setActualFilename('');
      setError(null);
      return;
    }

    const fetchFilename = async () => {
      try {
        const res = await fetch(`/api/submissions/${submissionId}?format=pdf&t=${Date.now()}`, {
          method: 'HEAD', // HEAD request to only get headers
          credentials: 'include',
        });

        if (!res.ok) {
          console.warn('Failed to fetch PDF headers');
          return;
        }

        // Get filename from headers
        const pdfFilenameHeader = res.headers.get('X-PDF-Filename');
        const contentDisposition = res.headers.get('Content-Disposition');
        
        let serverFilename = '';
        
        if (pdfFilenameHeader) {
          serverFilename = pdfFilenameHeader;
        } else if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match && match[1]) {
            serverFilename = match[1].replace(/['"]/g, '');
          }
        }

        if (serverFilename) {
          setActualFilename(serverFilename);
          console.log('📄 PDF filename from server:', serverFilename);
        }
      } catch (err) {
        console.warn('Error fetching PDF filename:', err);
      }
    };

    fetchFilename();
  }, [isOpen, submissionId]);

  // Generate filename with SIMLOK number only (no vendor name)
  const filename = useMemo(() => {
    if (nomorSimlok) {
      // Clean nomor SIMLOK: replace special chars with underscore
      const cleanNomor = nomorSimlok.replace(/[\[\]/\\]/g, '_');
      return `SIMLOK_${cleanNomor}.pdf`;
    }
    // Fallback to submission ID
    return `SIMLOK_${submissionName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  }, [nomorSimlok, submissionName]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setError(null);

      // Use actualFilename from state if available, otherwise use computed filename
      const targetFilename = actualFilename || filename;
      console.log('SimlokPdfModal: Starting download with filename:', targetFilename);
      
      // Always fetch fresh PDF for download to get proper Content-Disposition header
      const t = Date.now();
      const apiUrl = `/api/submissions/${encodeURIComponent(
        submissionId
      )}?format=pdf&t=${t}&clearCache=true`;

      const res = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'x-pdf-generation': 'true',
        }
      });
      
      if (!res.ok) throw new Error('Gagal mendownload PDF');

      // Get filename from server response headers (most reliable)
      let downloadFilename = targetFilename; // fallback
      
      const contentDisposition = res.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          downloadFilename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Also check custom header
      const pdfFilenameHeader = res.headers.get('X-PDF-Filename');
      if (pdfFilenameHeader) {
        downloadFilename = pdfFilenameHeader;
      }

      console.log('SimlokPdfModal: Download filename from server:', downloadFilename);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Create download link with proper filename
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename; // Use filename from server
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanup
      URL.revokeObjectURL(url);
      
      console.log('SimlokPdfModal: Download completed with filename:', downloadFilename);
    } catch (err) {
      console.error('Download error:', err);
      setError('Gagal mendownload PDF SIMLOK');
    }
  };

  // Optional: print (bisa gunakan blob URL langsung)
  // const handlePrint = () => {
  //   if (!pdfUrl) return;
  //   const w = window.open(pdfUrl, '_blank');
  //   if (w) {
  //     w.addEventListener('load', () => w.print());
  //   }
  // };

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
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between p-4 rounded-t-lg flex-shrink-0">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 rounded-lg p-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Dokumen SIMLOK</h3>
                <p className="text-sm text-blue-100">
                  {nomorSimlok ? `No: ${nomorSimlok}` : submissionName}
                </p>
                {actualFilename && (
                  <p className="text-xs text-blue-200 mt-1">
                    📄 {actualFilename}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* <button
                onClick={handlePrint}
                disabled={Boolean(loading || error || !pdfUrl)}
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

              <div className="w-px h-6 bg-white/20 mx-2" />

              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 transition-colors rounded-full"
                title="Tutup"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 relative bg-gray-100">
            {/* Overlay loading */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
                <div className="text-center">
                  <LoadingSpinner size="lg" className="mx-auto mb-4" />
                  <p className="text-gray-700 font-medium">Memuat dokumen SIMLOK...</p>
                  <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar</p>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center p-8">
                  <div className="text-red-500 text-6xl mb-4">!</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Gagal Memuat PDF</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <div className="space-x-4">
                    <button
                      onClick={() => {
                        setError(null);
                        setLoading(true);
                        // Force reload
                        window.location.reload();
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
            )}

            {/* 🎯 KEY FIX: iframe points DIRECTLY to API endpoint, not blob URL! */}
            {/* This allows browser's "Save as" to read Content-Disposition header */}
            {!error && pdfApiUrl && (
              <iframe
                key={pdfApiUrl}
                src={pdfApiUrl}
                className="w-full h-full border-0"
                title={`SIMLOK - ${submissionName}`}
                onLoad={() => {
                  setLoading(false);
                  setError(null);
                }}
                onError={() => {
                  setLoading(false);
                  setError('Gagal memuat dokumen PDF SIMLOK');
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
