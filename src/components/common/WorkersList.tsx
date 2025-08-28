'use client';

import { useState, useEffect } from 'react';
import { 
  UserIcon, 
  PhotoIcon, 
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { fileUrlHelper } from '@/lib/fileUrlHelper';

interface Worker {
  id: string;
  nama_pekerja: string;
  foto_pekerja: string | null;
  submission_id: string;
  created_at: string;
}

interface WorkersListProps {
  submissionId: string;
  fallbackWorkers?: string;
  layout?: 'grid' | 'list';
  showPhotos?: boolean;
  maxDisplayCount?: number;
  verificationMode?: boolean;
  className?: string;
}

export default function WorkersList({ 
  submissionId, 
  fallbackWorkers = '', 
  layout = 'grid',
  showPhotos = true,
  maxDisplayCount = 6,
  verificationMode = false,
  className = '',
}: WorkersListProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchWorkers = async () => {
      if (!submissionId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/submissions/${submissionId}/workers`);
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
          const fallbackWorkersList = fallbackWorkers.split(',').map((name, index) => ({
            id: `fallback-${index}`,
            nama_pekerja: name.trim(),
            foto_pekerja: null,
            submission_id: submissionId,
            created_at: new Date().toISOString(),
          }));
          setWorkers(fallbackWorkersList);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, [submissionId, fallbackWorkers]);

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
          <UserIcon className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Daftar Pekerja ({workers.length} orang)
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedWorkers.map((worker, index) => (
            <div
              key={worker.id}
              className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
                verificationMode 
                  ? 'border-purple-200 hover:border-purple-300' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Photo */}
                  {showPhotos && (
                    <div className="flex-shrink-0 relative">
                      {worker.foto_pekerja && !imageErrors.has(worker.id) ? (
                        <img
                          src={fileUrlHelper.convertLegacyUrl(worker.foto_pekerja, `foto_pekerja_${worker.id}`)}
                          alt={`Foto ${worker.nama_pekerja}`}
                          className="h-12 w-12 rounded-full object-cover border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
                          onError={() => handleImageError(worker.id)}
                          onClick={() => handleImageClick(worker.foto_pekerja!)}
                          title="Klik untuk memperbesar"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                          {worker.foto_pekerja ? (
                            <PhotoIcon className="h-6 w-6 text-gray-400" />
                          ) : (
                            <UserIcon className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                      )}
                      {verificationMode && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-100 border-2 border-white rounded-full flex items-center justify-center">
                          <EyeIcon className="h-3 w-3 text-purple-600" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Worker Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        #{index + 1}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 mt-1 truncate">
                      {worker.nama_pekerja}
                    </h4>

                    <div className="flex items-center mt-2">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        worker.foto_pekerja && !imageErrors.has(worker.id)
                          ? 'bg-green-400' 
                          : 'bg-orange-400'
                      }`}></div>
                      <span className={`text-xs ${
                        worker.foto_pekerja && !imageErrors.has(worker.id)
                          ? 'text-green-600' 
                          : 'text-orange-600'
                      }`}>
                        {worker.foto_pekerja && !imageErrors.has(worker.id) 
                          ? 'Foto tersedia' 
                          : 'Tanpa foto'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verification Actions */}
                {verificationMode && (
                  <div className="flex flex-col space-y-2 ml-3">
                    <button 
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                      title="Verifikasi Valid"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </button>
                    <button 
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Perlu Koreksi"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedWorkers.map((worker, index) => (
            <div
              key={worker.id}
              className={`flex items-center space-x-3 p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors ${
                verificationMode 
                  ? 'border-purple-200 hover:border-purple-300' 
                  : 'border-gray-200'
              }`}
            >
              {/* Number */}
              <span className="text-sm text-gray-500 min-w-[2rem]">
                {index + 1}.
              </span>
              
              {/* Photo */}
              {showPhotos && (
                <div className="flex-shrink-0 relative">
                  {worker.foto_pekerja && !imageErrors.has(worker.id) ? (
                    <img
                      src={fileUrlHelper.convertLegacyUrl(worker.foto_pekerja, `foto_pekerja_${worker.id}`)}
                      alt={`Foto ${worker.nama_pekerja}`}
                      className="h-10 w-10 rounded-full object-cover border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
                      onError={() => handleImageError(worker.id)}
                      onClick={() => handleImageClick(worker.foto_pekerja!)}
                      title="Klik untuk memperbesar"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                      {worker.foto_pekerja ? (
                        <PhotoIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <UserIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  )}
                  {verificationMode && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-100 border-2 border-white rounded-full flex items-center justify-center">
                      <EyeIcon className="h-2.5 w-2.5 text-purple-600" />
                    </div>
                  )}
                </div>
              )}
              
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {worker.nama_pekerja}
                </p>
              </div>
              
              {/* Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  worker.foto_pekerja && !imageErrors.has(worker.id)
                    ? 'bg-green-400' 
                    : 'bg-orange-400'
                }`}></div>
                <span className={`text-xs ${
                  worker.foto_pekerja && !imageErrors.has(worker.id)
                    ? 'text-green-600' 
                    : 'text-orange-600'
                }`}>
                  {worker.foto_pekerja && !imageErrors.has(worker.id) 
                    ? 'Foto tersedia' 
                    : 'Tanpa foto'}
                </span>
              </div>

              {/* Verification Actions */}
              {verificationMode && (
                <div className="flex space-x-2">
                  <button 
                    className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Verifikasi Valid"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                  </button>
                  <button 
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Perlu Koreksi"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo Modal for worker photos */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
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
      )}
    </div>
  );
}
