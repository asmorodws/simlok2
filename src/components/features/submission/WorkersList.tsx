'use client';

import { useState, useEffect } from 'react';
import { 
  UserIcon, 
  PhotoIcon, 
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  DocumentIcon 
} from '@heroicons/react/24/outline';
import { fileUrlHelper } from '@/lib/file/fileUrlHelper';
import DocumentPreviewModal from '@/components/features/document/DocumentPreviewModal';
import type { Worker } from '@/types';

interface WorkersListProps {
  submissionId: string;
  fallbackWorkers?: string;
  layout?: 'grid' | 'list';
  showPhotos?: boolean;
  maxDisplayCount?: number;
  verificationMode?: boolean;
  className?: string;
  // Context for different API endpoints
  context?: 'vendor' | 'reviewer' | 'admin' | 'approver';
}

export default function WorkersList({ 
  submissionId, 
  fallbackWorkers = '', 
  layout = 'grid',
  showPhotos = true,
  maxDisplayCount = 6,
  verificationMode = false,
  className = '',
  context = 'vendor',
}: WorkersListProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const fetchWorkers = async () => {
      if (!submissionId) {
        setLoading(false);
        return;
      }

      try {
        // Use universal submissions endpoint for all roles
        const apiUrl = `/api/submissions/${submissionId}/workers`;

        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch workers');
        }
        const data = await response.json();
        setWorkers(data.workers || []);
      } catch (err) {
        console.error('Error fetching workers:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Fallback: parse fallback workers string
        if (fallbackWorkers) {
          // Use Jakarta timezone for created_at fallback
          const jakartaNow = (() => {
            try {
              const date = new Date();
              const parts = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Jakarta',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              }).formatToParts(date);
              const map: Record<string, string> = {};
              for (const p of parts) {
                if (p.type && p.value) map[p.type] = p.value;
              }
              const y = map.year;
              const m = map.month;
              const d = map.day;
              const hh = map.hour;
              const mm = map.minute;
              const ss = map.second;
              return `${y}-${m}-${d}T${hh}:${mm}:${ss}+07:00`;
            } catch {
              return new Date().toISOString();
            }
          })();
          const fallbackWorkersList = fallbackWorkers.split(',').map((name, index) => ({
            id: `fallback-${index}`,
            worker_name: name.trim(),
            worker_photo: null,
            submission_id: submissionId,
            created_at: jakartaNow,
          }));
          setWorkers(fallbackWorkersList);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, [submissionId, fallbackWorkers, context]);

  const handleImageError = (workerId: string) => {
    setImageErrors(prev => new Set([...prev, workerId]));
  };

  const handleImageClick = (imageUrl: string) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
    }
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const handleDocumentView = (url: string, title: string) => {
    setSelectedDocument({ url: fileUrlHelper.convertLegacyUrl(url), title });
    setIsDocumentModalOpen(true);
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-center space-x-3 mb-3">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && workers.length === 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">Gagal memuat data pekerja</p>
        <p className="text-sm text-gray-400 mt-1">{error}</p>
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">Belum ada data pekerja</p>
      </div>
    );
  }

  const displayedWorkers = showAll || !maxDisplayCount ? workers : workers.slice(0, maxDisplayCount);
  const remainingCount = workers.length - (maxDisplayCount || 0);

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            Jumlah pekerja ({workers.length} orang)
          </span>
          {verificationMode && (
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Mode Verifikasi
            </span>
          )}
        </div>
        
        {maxDisplayCount && workers.length > maxDisplayCount && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {showAll ? 'Tampilkan Lebih Sedikit' : `Lihat Semua (+${remainingCount})`}
          </button>
        )}
      </div>

      {/* Workers Display */}
      {layout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {displayedWorkers.map((worker) => (
            <div
              key={worker.id}
              className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border ${
                verificationMode 
                  ? 'border-purple-200 hover:border-purple-300' 
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              {/* Photo Section - Large and prominent */}
              <div className="relative p-4 pb-2">
                {showPhotos && (
                  <div className="relative">
                    {worker.worker_photo && !imageErrors.has(worker.id) ? (
                      <img
                        src={fileUrlHelper.convertLegacyUrl(worker.worker_photo, `foto_pekerja_${worker.id}`)}
                        alt={`Foto ${worker.worker_name}`}
                        className="w-full h-48 rounded-lg object-cover cursor-pointer hover:scale-105 transition-transform duration-200 shadow-sm"
                        onError={() => handleImageError(worker.id)}
                        onClick={() => handleImageClick(worker.worker_photo!)}
                        title="Klik untuk memperbesar"
                      />
                    ) : (
                      <div className="w-full h-48 rounded-lg bg-gray-100 flex flex-col items-center justify-center shadow-sm">
                        {worker.worker_photo ? (
                          <>
                            <PhotoIcon className="h-12 w-12 text-gray-400 mb-2" />
                            <span className="text-xs text-gray-500">Gagal memuat foto</span>
                          </>
                        ) : (
                          <>
                            <UserIcon className="h-12 w-12 text-gray-400 mb-2" />
                            <span className="text-xs text-gray-500">Tidak ada foto</span>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Status indicator */}
                    <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-white ${
                      worker.worker_photo && !imageErrors.has(worker.id)
                        ? 'bg-green-500' 
                        : 'bg-orange-500'
                    }`}></div>
                    
                    {/* Verification badge */}
                    {verificationMode && (
                      <div className="absolute top-2 left-2 w-6 h-6 bg-purple-500 border-2 border-white rounded-full flex items-center justify-center">
                        <EyeIcon className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content Section - Name and details below photo */}
              <div className="p-4 pt-2">
                <h2 className="font-semibold text-gray-900 text-base mb-2">
                  {worker.worker_name}
                </h2>

                {/* HSSE Pass Information */}
                {(worker.hsse_pass_number || worker.hsse_pass_valid_thru) && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                    {/* <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">HSSE Pass:</span>
                    </div> */}
                    {worker.hsse_pass_number && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">HSSE Pass No:</span> {worker.hsse_pass_number}
                      </div>
                    )}
                    {worker.hsse_pass_valid_thru && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Masa Berlaku HSSE Pass Sampai Dengan:</span> {formatDate(worker.hsse_pass_valid_thru)}
                      </div>
                    )}
                    {worker.hsse_pass_document_upload && (
                      <button
                        onClick={() => handleDocumentView(worker.hsse_pass_document_upload!, `HSSE Pass - ${worker.worker_name}`)}
                        className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                      >
                        <DocumentIcon className="h-3.5 w-3.5" />
                        <span>Lihat Dokumen</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Verification Actions */}
                {verificationMode && (
                  <div className="flex justify-center space-x-2 pt-3 border-t border-gray-100 mt-3">
                    <button 
                      className="flex items-center justify-center w-8 h-8 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                      title="Verifikasi Valid"
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                    </button>
                    <button 
                      className="flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Perlu Koreksi"
                    >
                      <XCircleIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedWorkers.map((worker, index) => (
            <div
              key={worker.id}
              className={`flex items-center space-x-4 p-4 bg-white border rounded-xl hover:shadow-md transition-all duration-200 ${
                verificationMode 
                  ? 'border-purple-200 hover:border-purple-300' 
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              {/* Number */}
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {index + 1}
                </span>
              </div>
              
              {/* Photo */}
              {showPhotos && (
                <div className="flex-shrink-0 relative">
                  {worker.worker_photo && !imageErrors.has(worker.id) ? (
                    <img
                      src={fileUrlHelper.convertLegacyUrl(worker.worker_photo, `foto_pekerja_${worker.id}`)}
                      alt={`Foto ${worker.worker_name}`}
                      className="h-12 w-12 rounded-lg object-cover border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-colors shadow-sm"
                      onError={() => handleImageError(worker.id)}
                      onClick={() => handleImageClick(worker.worker_photo!)}
                      title="Klik untuk memperbesar"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                      {worker.worker_photo ? (
                        <PhotoIcon className="h-6 w-6 text-gray-400" />
                      ) : (
                        <UserIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  )}
                  
                  {/* Status indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    worker.worker_photo && !imageErrors.has(worker.id)
                      ? 'bg-green-500' 
                      : 'bg-orange-500'
                  }`}></div>
                  
                  {verificationMode && (
                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-purple-500 border-2 border-white rounded-full flex items-center justify-center">
                      <EyeIcon className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
              )}
              
              {/* Worker Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-gray-900 truncate">
                  {worker.worker_name}
                </h3>
                <div className="space-y-0.5 mt-1">
                  <p className="text-sm text-gray-500">
                    Pekerja #{index + 1}
                  </p>
                  {(worker.hsse_pass_number || worker.hsse_pass_valid_thru) && (
                    <div className="flex items-center space-x-3 text-xs text-gray-600">
                      {worker.hsse_pass_number && (
                        <span>
                          <span className="font-medium">HSSE:</span> {worker.hsse_pass_number}
                        </span>
                      )}
                      {worker.hsse_pass_valid_thru && (
                        <span>
                          <span className="font-medium">Berlaku:</span> {formatDate(worker.hsse_pass_valid_thru)}
                        </span>
                      )}
                    </div>
                  )}
                  {worker.hsse_pass_document_upload && (
                    <button
                      onClick={() => handleDocumentView(worker.hsse_pass_document_upload!, `HSSE Pass - ${worker.worker_name}`)}
                      className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <DocumentIcon className="h-3.5 w-3.5" />
                      <span>Lihat Dokumen HSSE</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Status Badge */}
              <div className="flex-shrink-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  worker.worker_photo && !imageErrors.has(worker.id)
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-1.5 ${
                    worker.worker_photo && !imageErrors.has(worker.id)
                      ? 'bg-green-400' 
                      : 'bg-orange-400'
                  }`}></div>
                  {worker.worker_photo && !imageErrors.has(worker.id) 
                    ? 'Foto Tersedia' 
                    : 'Tanpa Foto'}
                </span>
              </div>

              {/* Verification Actions */}
              {verificationMode && (
                <div className="flex space-x-2 flex-shrink-0">
                  <button 
                    className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                    title="Verifikasi Valid"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                  </button>
                  <button 
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Perlu Koreksi"
                  >
                    <XCircleIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo Modal for worker photos */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 transition-opacity"
            onClick={closeModal}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
              <button
                onClick={closeModal}
                className="absolute top-2 right-2 z-10 bg-white hover:bg-gray-100 rounded-full p-2 shadow-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <img
                src={selectedImage}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal for HSSE documents */}
      <DocumentPreviewModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        fileUrl={selectedDocument?.url || ''}
        fileName={selectedDocument?.title || ''}
      />
    </div>
  );
}
