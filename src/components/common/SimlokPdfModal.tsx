'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../ui/LoadingSpinner';

interface SimlokPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  submissionName: string;
  nomorSimlok?: string;
}

// 🎯 OPTIMAL CACHING: Session-level cache for PDF blob URLs
// This prevents re-fetching the same PDF when modal is reopened
const pdfBlobCache = new Map<string, { blobUrl: string; filename: string; timestamp: number }>();

// Cache expiry time: 5 minutes (PDF might change if submission is edited)
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

export default function SimlokPdfModal({
  isOpen,
  onClose,
  submissionId,
  submissionName,
  nomorSimlok,
}: SimlokPdfModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [actualFilename, setActualFilename] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Generate filename with SIMLOK number
  const filename = useMemo(() => {
    if (nomorSimlok) {
      const cleanNomor = nomorSimlok.replace(/[\[\]/\\]/g, '_');
      return `SIMLOK_${cleanNomor}.pdf`;
    }
    return `SIMLOK_${submissionName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  }, [nomorSimlok, submissionName]);

  // 🎯 FETCH PDF with caching
  const fetchPdf = useCallback(async (forceRefresh = false) => {
    if (!submissionId) return;

    // Check cache first (unless force refresh)
    const cacheKey = submissionId;
    const cached = pdfBlobCache.get(cacheKey);
    
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_EXPIRY_MS)) {
      console.log('[SimlokPdfModal] ✅ Using cached PDF blob');
      setPdfBlobUrl(cached.blobUrl);
      setActualFilename(cached.filename);
      setLoading(false);
      return;
    }

    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      console.log('[SimlokPdfModal] 🔄 Fetching PDF...');
      
      const apiUrl = `/api/submissions/${encodeURIComponent(submissionId)}?format=pdf&t=${Date.now()}`;
      
      const res = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        signal: abortControllerRef.current.signal,
        headers: {
          'x-pdf-generation': 'true',
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      // Get filename from headers
      let serverFilename = filename;
      const pdfFilenameHeader = res.headers.get('X-PDF-Filename');
      const contentDisposition = res.headers.get('Content-Disposition');
      
      if (pdfFilenameHeader) {
        serverFilename = pdfFilenameHeader;
      } else if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          serverFilename = match[1].replace(/['"]/g, '');
        }
      }

      const blob = await res.blob();
      
      // Revoke old blob URL if exists in cache
      if (cached?.blobUrl) {
        URL.revokeObjectURL(cached.blobUrl);
      }

      const newBlobUrl = URL.createObjectURL(blob);
      
      // Update cache
      pdfBlobCache.set(cacheKey, {
        blobUrl: newBlobUrl,
        filename: serverFilename,
        timestamp: Date.now()
      });

      if (isMountedRef.current) {
        setPdfBlobUrl(newBlobUrl);
        setActualFilename(serverFilename);
        setLoading(false);
        console.log('[SimlokPdfModal] ✅ PDF loaded and cached');
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[SimlokPdfModal] Fetch aborted');
        return;
      }
      
      console.error('[SimlokPdfModal] ❌ Error fetching PDF:', err);
      if (isMountedRef.current) {
        setError(`Gagal memuat PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    }
  }, [submissionId, filename]);

  // 🎯 Load PDF when modal opens
  useEffect(() => {
    isMountedRef.current = true;

    if (isOpen && submissionId) {
      // Reset state
      setError(null);
      
      // Check if we have a valid cached blob URL
      const cached = pdfBlobCache.get(submissionId);
      if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRY_MS)) {
        // Use cache immediately - no loading state needed
        setPdfBlobUrl(cached.blobUrl);
        setActualFilename(cached.filename);
        setLoading(false);
        console.log('[SimlokPdfModal] ✅ Instant load from cache');
      } else {
        // Need to fetch
        setLoading(true);
        setPdfBlobUrl(null);
        fetchPdf();
      }
    }

    return () => {
      isMountedRef.current = false;
      // Abort any ongoing fetch when modal closes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, submissionId, fetchPdf]);

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

  // Handle refresh (force re-fetch)
  const handleRefresh = useCallback(() => {
    // Clear cache for this submission
    const cached = pdfBlobCache.get(submissionId);
    if (cached?.blobUrl) {
      URL.revokeObjectURL(cached.blobUrl);
    }
    pdfBlobCache.delete(submissionId);
    setPdfBlobUrl(null);
    fetchPdf(true);
  }, [submissionId, fetchPdf]);

  if (!isOpen) return null;

  // 🎯 Handle download - use cached blob if available
  const handleDownload = async () => {
    try {
      setError(null);
      const targetFilename = actualFilename || filename;
      console.log('[SimlokPdfModal] Starting download with filename:', targetFilename);

      if (pdfBlobUrl) {
        // Use cached blob URL directly - instant download!
        const a = document.createElement('a');
        a.href = pdfBlobUrl;
        a.download = targetFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log('[SimlokPdfModal] ✅ Downloaded from cache');
      } else {
        // Fetch fresh for download
        const res = await fetch(
          `/api/submissions/${encodeURIComponent(submissionId)}?format=pdf&t=${Date.now()}&clearCache=true`,
          {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
          }
        );
        
        if (!res.ok) throw new Error('Gagal mendownload PDF');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = targetFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('[SimlokPdfModal] ✅ Downloaded fresh');
      }
    } catch (err) {
      console.error('[SimlokPdfModal] Download error:', err);
      setError('Gagal mendownload PDF SIMLOK');
    }
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
                     {actualFilename}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 transition-colors rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh PDF"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Download button */}
              <button
                onClick={handleDownload}
                disabled={loading || !!error}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 transition-colors rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download PDF"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>

              <div className="w-px h-6 bg-white/20 mx-2" />

              {/* Close button */}
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
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="text-center p-8">
                  <div className="text-red-500 text-6xl mb-4">⚠️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Gagal Memuat PDF</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <div className="space-x-4">
                    <button
                      onClick={handleRefresh}
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

            {/* 🎯 OPTIMAL: iframe uses cached blob URL for instant display */}
            {!error && pdfBlobUrl && (
              <iframe
                src={pdfBlobUrl}
                className="w-full h-full border-0"
                title={`SIMLOK - ${submissionName}`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
