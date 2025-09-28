/**
 * Enhanced Mobile-First Submissions List for Verifier
 * Optimized for mobile user experience with card-based layout
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  QrCodeIcon,
  DocumentArrowDownIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UserIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/hooks/useToast';
import Button from '../ui/button/Button';
import CameraQRScanner from '../scanner/CameraQRScanner';

interface SubmissionData {
  id: string;
  vendor_name: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  simlok_number?: string;
  simlok_date?: string;
  created_at: string;
}

interface FilterOptions {
  status: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
  dateRange: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
  search: string;
}

export default function EnhancedSubmissionsList() {
  const { showError, showSuccess } = useToast();
  
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    status: 'ALL',
    dateRange: 'ALL',
    search: ''
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: true
  });

  useEffect(() => {
    fetchSubmissions();
  }, [filters, pagination.offset]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
        status: filters.status,
        dateRange: filters.dateRange,
        search: filters.search
      });

      const response = await fetch(`/api/verifier/submissions?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        // Append new submissions if loading more, otherwise replace
        if (pagination.offset === 0) {
          setSubmissions(data.submissions || []);
        } else {
          setSubmissions(prev => [...prev, ...(data.submissions || [])]);
        }
        
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          hasMore: data.pagination?.hasMore || false
        }));
      } else {
        showError('Error', 'Gagal memuat data submissions');
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      showError('Error', 'Gagal memuat data submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleScanResult = async (scannedData: string) => {
    try {
      setScannerOpen(false);
      
      // Extract submission ID from QR code data
      let submissionId = scannedData;
      
      if (scannedData.startsWith('{')) {
        try {
          const qrData = JSON.parse(scannedData);
          submissionId = qrData.submissionId || qrData.id || scannedData;
        } catch (e) {
          // If parsing fails, use the raw data
        }
      }

      // Navigate to submission detail
      window.location.href = `/verifier/submissions/${submissionId}`;
      showSuccess('Success', 'QR Code berhasil dipindai');
      
    } catch (error) {
      console.error('Error processing barcode:', error);
      showError('Error', 'Gagal memproses QR Code');
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      APPROVED: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: CheckCircleIcon,
        label: 'Disetujui'
      },
      REJECTED: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: XCircleIcon,
        label: 'Ditolak'
      },
      PENDING: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: ClockIcon,
        label: 'Pending'
      }
    };

    const config = configs[status as keyof typeof configs] || configs.PENDING;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const loadMore = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'ALL',
      dateRange: 'ALL',
      search: ''
    });
  };

  const activeFiltersCount = Object.values(filters).filter(value => value !== 'ALL' && value !== '').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Daftar SIMLOK
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {pagination.total.toLocaleString()} submissions
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* QR Scan Button */}
              <Button
                onClick={() => setScannerOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2"
                size="sm"
              >
                <QrCodeIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {filtersOpen && (
          <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Filters</h3>
              <div className="flex items-center space-x-2">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pencarian
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Cari nomor SIMLOK, vendor..."
                />
              </div>
            </div>

            {/* Status & Date Filters */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange({ status: e.target.value as FilterOptions['status'] })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">Semua</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Disetujui</option>
                  <option value="REJECTED">Ditolak</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Periode
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange({ dateRange: e.target.value as FilterOptions['dateRange'] })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">Semua</option>
                  <option value="TODAY">Hari Ini</option>
                  <option value="WEEK">Minggu Ini</option>
                  <option value="MONTH">Bulan Ini</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {loading && pagination.offset === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Tidak ada submissions
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Tidak ada submissions yang sesuai dengan filter.
            </p>
          </div>
        ) : (
          <>
            {/* Card View */}
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <DocumentArrowDownIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {submission.simlok_number || 'Belum ada nomor'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(submission.created_at)}
                          </div>
                        </div>
                      </div>
                      
                      {getStatusBadge(submission.approval_status)}
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <BuildingOfficeIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {submission.vendor_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {submission.officer_name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-600">
                          {submission.work_location}
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <UserIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {submission.job_description}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <Button
                        onClick={() => window.location.href = `/verifier/submissions/${submission.id}`}
                        variant="primary"
                        size="sm"
                        className="w-full justify-center"
                      >
                        <EyeIcon className="w-4 h-4 mr-2" />
                        Lihat Detail
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {pagination.hasMore && (
              <div className="mt-6">
                <Button
                  onClick={loadMore}
                  disabled={loading}
                  variant="outline"
                  className="w-full justify-center py-3"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Memuat...
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="w-4 h-4 mr-2" />
                      Muat Lebih Banyak
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button - Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <button
          onClick={() => setScannerOpen(true)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
        >
          <QrCodeIcon className="w-6 h-6" />
        </button>
      </div>

      {/* QR Code Scanner */}
      {scannerOpen && (
        <CameraQRScanner
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleScanResult}
          title="Scan QR Code SIMLOK"
          description="Posisikan kamera pada QR code untuk membuka detail submission"
        />
      )}
    </div>
  );
}