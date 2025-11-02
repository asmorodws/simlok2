'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  CalendarDaysIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  ClockIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  XMarkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/hooks/useToast';
import Button from '../ui/button/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import SimlokPdfModal from '@/components/common/SimlokPdfModal';
import ScanDetailModal from '@/components/common/ScanDetailModal';
import { cachedFetch, apiCache } from '@/lib/api/client';

interface QrScan {
  id: string;
  submission_id: string;
  scanned_by: string;
  scanned_at: string;
  scanner_name: string;
  scan_location?: string;
  notes?: string;
  submission: {
    id: string;
    simlok_number?: string;
    vendor_name: string;
    officer_name: string;
    job_description: string;
    work_location: string;
    approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    working_hours?: string;
    implementation?: string;
    simja_number?: string;
    sika_number?: string;
    worker_count?: number;
    implementation_start_date?: string;
    implementation_end_date?: string;
    created_at?: string;
    review_status?: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
  };
}

export default function VerifierScanHistory() {
  const { showError } = useToast();
  
  const [scans, setScans] = useState<QrScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    location: ''
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: true
  });
  const [selectedScan, setSelectedScan] = useState<QrScan | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Ref untuk tracking mounting state
  const isMountedRef = useRef(false);
  // Ref untuk tracking ongoing fetch
  const fetchingRef = useRef(false);

  // Initial fetch saat component mount
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      fetchScanHistory();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch ulang saat dependencies berubah (kecuali saat initial mount)
  useEffect(() => {
    if (isMountedRef.current) {
      fetchScanHistory();
    }
  }, [pagination.offset, searchTerm, filters.status, filters.dateFrom, filters.dateTo, filters.location]); // eslint-disable-line react-hooks/exhaustive-deps

  // Custom event listener for refreshing scan history after QR scan
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout | null = null;
    
    const handleVerifierScanRefresh = () => {
      console.log('Verifier scan refresh event received, scheduling scan history refresh...');
      
      // Clear any existing timeout to debounce multiple refresh calls
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      
      // Refresh data without loading state to avoid modal interference
      refreshTimeout = setTimeout(() => {
        console.log('Executing scan history refresh (silent)...');
        // Invalidate cache untuk refresh
        apiCache.invalidatePattern('/api/qr/verify');
        // Silent refresh - tidak tampilkan loading dan error toast
        fetchScanHistory(false, true); // false = no loading state, true = silent mode
      }, 150); // Reduced delay since no loading state
    };

    window.addEventListener('verifier-scan-refresh', handleVerifierScanRefresh);

    return () => {
      window.removeEventListener('verifier-scan-refresh', handleVerifierScanRefresh);
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, []);

  const fetchScanHistory = async (showLoading = true, silent = false) => {
    // Prevent duplicate fetch calls
    if (fetchingRef.current) {
      console.log('⏭️ Skipping fetch - already in progress');
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    try {
      fetchingRef.current = true;
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
        search: searchTerm
      });

      // Add filters to params
      if (filters.status) params.append('status', filters.status);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.location) params.append('location', filters.location);

      const data = await cachedFetch<{
        scans: QrScan[];
        pagination?: {
          total: number;
          hasMore: boolean;
        };
      }>(`/api/qr/verify?${params}`, { cacheTTL: 30 * 1000 });
      
      setScans(data.scans || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        hasMore: data.pagination?.hasMore || false
      }));
    } catch (error) {
      console.error('Error fetching scan history:', error);
      // Hanya tampilkan error toast jika bukan silent refresh
      if (!silent) {
        showError('Error', 'Gagal memuat riwayat scan');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      dateFrom: '',
      dateTo: '',
      location: ''
    });
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const loadMore = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            Menunggu
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Disetujui
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-3 h-3 mr-1" />
            Ditolak
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Riwayat Scan QR</h1>
          <p className="text-sm text-gray-600 mt-1">
            Daftar SIMLOK yang telah Anda scan
          </p>
        </div>
        
        <div className="flex items-center text-sm text-gray-500">
          <CalendarDaysIcon className="w-4 h-4 mr-2" />
          Total: {pagination.total} scan
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Cari nomor SIMLOK, vendor, atau lokasi scan..."
            />
          </div>

          {/* Filter Toggle Button */}
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className={showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filter
              {hasActiveFilters && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  {Object.values(filters).filter(v => v !== '').length}
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">Semua Status</option>
                    <option value="PENDING">Menunggu</option>
                    <option value="APPROVED">Disetujui</option>
                    <option value="REJECTED">Ditolak</option>
                  </select>
                </div>

                {/* Date From Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Dari
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* Date To Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Sampai
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* Location Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lokasi Scan
                  </label>
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    placeholder="Lokasi scan..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scan History List */}
      <div className="bg-white shadow rounded-lg">
        {loading && pagination.offset === 0 ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : scans.length === 0 ? (
          <div className="text-center py-12">
            <QrCodeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Belum ada riwayat scan
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Tidak ada hasil yang sesuai dengan pencarian.' : 'Anda belum melakukan scan QR code SIMLOK.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="block lg:hidden">
              <div className="divide-y divide-gray-200">
                {scans.map((scan) => (
                  <div key={scan.id} className="p-4 hover:bg-gray-50 transition-colors">
                    {/* Header with Status and Date */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(scan.submission.approval_status)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateShort(scan.scanned_at)}
                      </div>
                    </div>

                    {/* SIMLOK Number */}
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        <QrCodeIcon className="w-4 h-4 mr-2 text-blue-500" />
                        {scan.submission.simlok_number || 'Belum ada nomor'}
                      </div>
                    </div>

                    {/* Vendor Info */}
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-900 mb-1 flex items-center">
                        <BuildingOfficeIcon className="w-4 h-4 mr-2 text-gray-400" />
                        {scan.submission.vendor_name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center ml-6">
                        <UserIcon className="w-3 h-3 mr-1" />
                        {scan.submission.officer_name}
                      </div>
                    </div>

                    {/* Scan Location */}
                    {scan.scan_location && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 flex items-center">
                          <MapPinIcon className="w-3 h-3 mr-1" />
                          Discan di: {scan.scan_location}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2">
                      <Button
                        onClick={() => setSelectedScan(scan)}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        <EyeIcon className="w-4 h-4 mr-2" />
                        Detail
                      </Button>
                      {scan.submission.approval_status === 'APPROVED' && scan.submission.simlok_number && (
                        <Button
                          onClick={() => {
                            setSelectedScan(scan);
                            setIsPdfModalOpen(true);
                          }}
                          variant="primary"
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          <DocumentTextIcon className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden lg:block">
              <div className="overflow-hidden  md:rounded-lg">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200" style={{tableLayout: 'fixed', width: '100%'}}>
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '150px'}}>
                          SIMLOK
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '200px'}}>
                          Vendor
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '180px'}}>
                          Lokasi Scan
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px'}}>
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '150px'}}>
                          Waktu Scan
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px'}}>
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {scans.map((scan) => (
                        <tr key={scan.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm" style={{width: '150px'}}>
                            <div className="font-medium text-gray-900 truncate" title={scan.submission.simlok_number || 'Belum ada nomor'}>
                              {scan.submission.simlok_number || 'Belum ada nomor'}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm" style={{width: '200px'}}>
                            <div>
                              <div className="font-medium text-gray-900 truncate" title={scan.submission.vendor_name}>
                                {scan.submission.vendor_name}
                              </div>
                              <div className="text-gray-500 truncate" title={scan.submission.officer_name}>
                                {scan.submission.officer_name}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm" style={{width: '180px'}}>
                            <div className="text-gray-900 truncate" title={scan.scan_location || 'Tidak diketahui'}>
                              {scan.scan_location || 'Tidak diketahui'}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap" style={{width: '120px'}}>
                            {getStatusBadge(scan.submission.approval_status)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500" style={{width: '150px'}}>
                            {formatDate(scan.scanned_at)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium" style={{width: '120px'}}>
                            <div className="flex justify-end space-x-2">
                              <Button
                                onClick={() => setSelectedScan(scan)}
                                variant="outline"
                                size="sm"
                                title="Lihat Detail"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                              {scan.submission.approval_status === 'APPROVED' && scan.submission.simlok_number && (
                                <Button
                                  onClick={() => {
                                    setSelectedScan(scan);
                                    setIsPdfModalOpen(true);
                                  }}
                                  variant="primary"
                                  size="sm"
                                  title="Lihat PDF SIMLOK"
                                >
                                  <DocumentTextIcon className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Load More */}
        {pagination.hasMore && scans.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-200">
            <Button
              onClick={loadMore}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Memuat...
                </div>
              ) : (
                'Muat Lebih Banyak'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Scan Detail Modal */}
      <ScanDetailModal
        isOpen={!!selectedScan}
        onClose={() => setSelectedScan(null)}
        scan={selectedScan}
        onViewPdf={() => setIsPdfModalOpen(true)}
        showPdfButton={true}
        title="Detail Scan QR Code"
      />

      {/* PDF Modal */}
      {selectedScan && (
        <SimlokPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          submissionId={selectedScan.submission_id}
          submissionName={selectedScan.submission.vendor_name || ''}
          nomorSimlok={selectedScan.submission.simlok_number || ''}
        />
      )}
    </div>
  );
}