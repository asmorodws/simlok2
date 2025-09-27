'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null); // <-- ubah: null, bukan ""
  const objectUrlRef = useRef<string | null>(null); // untuk blob URL cleanup

  // Cleanup object URL ketika modal ditutup/unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

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

  // Siapkan URL/pdf saat modal dibuka, cleanup saat ditutup
  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (!isOpen || !submissionId) {
        // Reset state when modal is closed
        setPdfUrl(null);
        setError(null);
        setLoading(true);
        return;
      }

      setLoading(true);
      setError(null);

      // bersihkan object URL lama
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPdfUrl(null);

      try {
        // Pakai timestamp supaya bypass cache
        const t = Date.now();
        const apiUrl = `/api/submissions/${encodeURIComponent(
          submissionId
        )}?format=pdf&t=${t}`;

        // Kalau endpoint protected, pakai credentials: 'include'
        // dan mode 'same-origin' (default) supaya cookie terkirim
        const res = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          // Try to get error details from response
          try {
            const errorData = await res.json();
            throw new Error(errorData.error || `Gagal memuat PDF (${res.status})`);
          } catch (jsonError) {
            throw new Error(`Gagal memuat PDF (${res.status})`);
          }
        }

        // Gunakan blob -> object URL agar:
        // - lebih stabil di berbagai browser
        // - bisa di-print/download tanpa kebijakan CORS aneh
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        if (!cancelled) {
          setPdfUrl(url);
          setLoading(false);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Gagal memuat dokumen PDF SIMLOK.');
          setLoading(false);
        }
      }
    }

    prepare();

    return () => {
      cancelled = true;
    };
  }, [isOpen, submissionId]);

  // Generate filename (must be before early return to avoid hook order issues)
  const filename = useMemo(() => {
    if (nomorSimlok) return `SIMLOK_${nomorSimlok.replace(/[/\\]/g, '_')}.pdf`;
    return `SIMLOK_${submissionName.replace(/[/\\]/g, '_')}.pdf`;
  }, [nomorSimlok, submissionName]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setError(null);

      // Jika kita sudah punya blob URL, kita bisa fetch ulang BLOB-nya dari URL asli
      // atau langsung pakai fetch API lagi supaya dapat file fresh.
      // Lebih konsisten: refetch dari endpoint (agar bukan blob object sementara).
      const t = Date.now();
      const apiUrl = `/api/submissions/${encodeURIComponent(
        submissionId
      )}?format=pdf&t=${t}`;

      const res = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Gagal mendownload PDF');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
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
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
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
                        // trigger ulang effect dengan toggle isOpen sebentar
                        setError(null);
                        // force reload dengan ganti submissionId param waktu
                        // (cukup biarkan effect di atas jalan otomatis saat error==null + isOpen true)
                        const t = Date.now();
                        const apiUrl = `/api/submissions/${encodeURIComponent(
                          submissionId
                        )}?format=pdf&t=${t}`;
                        setLoading(true);
                        fetch(apiUrl, { credentials: 'include' })
                          .then(r => {
                            if (!r.ok) throw new Error('Gagal memuat ulang');
                            return r.blob();
                          })
                          .then(b => {
                            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
                            const url = URL.createObjectURL(b);
                            objectUrlRef.current = url;
                            setPdfUrl(url);
                            setLoading(false);
                          })
                          .catch(e => {
                            setLoading(false);
                            setError(e?.message || 'Gagal memuat ulang dokumen');
                          });
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

            {/* Hanya render iframe saat pdfUrl siap */}
            {!error && pdfUrl && pdfUrl.trim() !== '' && (
              <iframe
                key={pdfUrl} // re-mount saat URL berubah
                src={pdfUrl}
                className="w-full h-full border-0"
                title={`SIMLOK - ${submissionName}`}
                onLoad={() => {
                  // sebagian browser tidak memanggil ini untuk blob URL; tidak masalah
                  setLoading(false);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
