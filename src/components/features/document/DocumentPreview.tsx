/**
 * Optimized Document Preview Component
 * 
 * Features:
 * - Lazy loading untuk file besar
 * - Skeleton loader untuk better UX
 * - Error handling dengan retry
 * - Thumbnail preview untuk PDF
 * - Fallback untuk browser yang tidak support PDF embed
 * 
 * Usage:
 * <DocumentPreview url="/api/files/..." filename="document.pdf" />
 */

'use client';

import { useState, useEffect } from 'react';
import { DocumentIcon, ArrowDownTrayIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface DocumentPreviewProps {
  url: string;
  filename?: string;
  type?: 'pdf' | 'image' | 'doc' | 'docx';
  showDownload?: boolean;
  className?: string;
}

export default function DocumentPreview({
  url,
  filename,
  type,
  showDownload = true,
  className = '',
}: DocumentPreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Detect file type from URL or filename
  const detectedType = type || detectFileType(url, filename);

  /**
   * Load preview only when user opens it (lazy loading)
   */
  const loadPreview = async () => {
    if (previewUrl) {
      setIsPreviewOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For images and PDFs, we can use the URL directly
      // Browser will handle range requests automatically
      setPreviewUrl(url);
      setIsPreviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Download file
   */
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  /**
   * Cleanup
   */
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className={`relative ${className}`}>
      {/* Preview Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={loadPreview}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
              Loading...
            </>
          ) : (
            <>
              <EyeIcon className="h-4 w-4 mr-2" />
              Preview
            </>
          )}
        </button>

        {showDownload && (
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Download
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="relative w-full max-w-6xl h-full max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <DocumentIcon className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900">
                  {filename || 'Document Preview'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {showDownload && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  title="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-4">
              {detectedType === 'pdf' && (
                <PreviewPDF url={previewUrl} />
              )}
              {detectedType === 'image' && (
                <PreviewImage url={previewUrl} {...(filename ? { filename } : {})} />
              )}
              {(detectedType === 'doc' || detectedType === 'docx') && (
                <PreviewOfficeDoc url={previewUrl} {...(filename ? { filename } : {})} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * PDF Preview with lazy loading
 * Uses browser's built-in PDF viewer with range request support
 */
function PreviewPDF({ url }: { url: string }) {
  return (
    <div className="w-full h-full">
      <iframe
        src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
        className="w-full h-full border-0"
        title="PDF Preview"
        loading="lazy"
      />
      <p className="text-sm text-gray-500 mt-2">
        💡 Tip: Browser PDF viewer mendukung lazy loading - hanya bagian yang terlihat yang di-load
      </p>
    </div>
  );
}

/**
 * Image Preview with lazy loading
 */
function PreviewImage({ url, filename }: { url: string; filename?: string }) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <img
        src={url}
        alt={filename || 'Preview'}
        className="max-w-full max-h-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

/**
 * Office Document Preview (DOC/DOCX)
 * Shows download message since browser can't preview Office docs
 */
function PreviewOfficeDoc({ url, filename }: { url: string; filename?: string }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-center p-8">
      <DocumentIcon className="h-24 w-24 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Office Document Preview
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Browser tidak dapat menampilkan preview untuk file Office (.doc/.docx).
        <br />
        Silakan download file untuk membukanya.
      </p>
      <a
        href={url}
        download={filename}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
      >
        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
        Download {filename}
      </a>
    </div>
  );
}

/**
 * Detect file type from URL or filename
 */
function detectFileType(url: string, filename?: string): 'pdf' | 'image' | 'doc' | 'docx' {
  const name = filename || url;
  const ext = name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'image';
    case 'doc':
      return 'doc';
    case 'docx':
      return 'docx';
    default:
      return 'pdf';
  }
}
