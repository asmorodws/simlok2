'use client';

import { useState, useEffect } from 'react';
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
  DocumentTextIcon,
  UsersIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '@/hooks/useToast';
import Button from '../ui/button/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

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

  useEffect(() => {
    fetchScanHistory();
  }, [pagination.offset, searchTerm, filters]);

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
        fetchScanHistory(false); // false = no loading state, just update data
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

  const fetchScanHistory = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
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

      const response = await fetch(`/api/qr/verify?${params}`);
      if (response.ok) {
        const data = await response.json();
        setScans(data.scans || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          hasMore: data.pagination?.hasMore || false
        }));
      } else {
        showError('Error', 'Gagal memuat riwayat scan');
      }
    } catch (error) {
      console.error('Error fetching scan history:', error);
      showError('Error', 'Gagal memuat riwayat scan');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
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

                    {/* Action Button */}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => setSelectedScan(scan)}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <EyeIcon className="w-4 h-4 mr-2" />
                        Lihat Detail
                      </Button>
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
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '80px'}}>
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
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium" style={{width: '80px'}}>
                            <Button
                              onClick={() => setSelectedScan(scan)}
                              variant="outline"
                              size="sm"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Button>
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

      {/* Enhanced Detail Modal */}
      {selectedScan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <QrCodeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Detail Scan QR Code</h3>
                    <p className="text-blue-100 text-sm">
                      {selectedScan.submission.simlok_number || 'Informasi Pengajuan'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedScan(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Status Banner */}
              <div className="mb-6">
                {selectedScan.submission.approval_status === 'PENDING_APPROVAL' && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ClockIcon className="w-5 h-5 text-yellow-600 mr-2" />
                      <span className="font-semibold text-yellow-800">Status: Menunggu Persetujuan</span>
                    </div>
                  </div>
                )}
                {selectedScan.submission.approval_status === 'APPROVED' && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                      <span className="font-semibold text-green-800">Status: Telah Disetujui</span>
                    </div>
                  </div>
                )}
                {selectedScan.submission.approval_status === 'REJECTED' && (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg">
                    <div className="flex items-center">
                      <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                      <span className="font-semibold text-red-800">Status: Ditolak</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Content Grid */}
              <div className="space-y-6">
                {/* Submission Information */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center mb-6">
                    <div className="p-3 bg-blue-100 rounded-xl mr-4">
                      <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-800">Informasi Pengajuan</h4>
                      <p className="text-sm text-gray-500">Detail lengkap pengajuan SIMLOK</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <QrCodeIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-600">Nomor SIMLOK</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {selectedScan.submission.simlok_number || 'Belum ada nomor'}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-600">Perusahaan</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedScan.submission.vendor_name}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <UserIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-600">Petugas PIC</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedScan.submission.officer_name}
                        </p>
                      </div>

                      {selectedScan.submission.worker_count && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <UsersIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-600">Jumlah Pekerja</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900">
                            {selectedScan.submission.worker_count} orang
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <BriefcaseIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-600">Deskripsi Pekerjaan</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {selectedScan.submission.job_description}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPinIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-600">Lokasi Kerja</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {selectedScan.submission.work_location}
                        </p>
                      </div>

                      {selectedScan.submission.working_hours && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <ClockIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-600">Jam Kerja</span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {selectedScan.submission.working_hours}
                          </p>
                        </div>
                      )}

                      {(selectedScan.submission.implementation_start_date || selectedScan.submission.implementation_end_date) && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-600">Periode Pelaksanaan</span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {selectedScan.submission.implementation_start_date && 
                              format(new Date(selectedScan.submission.implementation_start_date), 'dd MMM yyyy', { locale: id })}
                            {selectedScan.submission.implementation_start_date && selectedScan.submission.implementation_end_date && ' - '}
                            {selectedScan.submission.implementation_end_date && 
                              format(new Date(selectedScan.submission.implementation_end_date), 'dd MMM yyyy', { locale: id })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Document Numbers */}
                  {(selectedScan.submission.simja_number || selectedScan.submission.sika_number) && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3">Nomor Dokumen Pendukung</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedScan.submission.simja_number && (
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <span className="text-xs font-medium text-blue-600">SIMJA</span>
                            <p className="text-sm font-semibold text-blue-900 mt-1">
                              {selectedScan.submission.simja_number}
                            </p>
                          </div>
                        )}
                        {selectedScan.submission.sika_number && (
                          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <span className="text-xs font-medium text-green-600">SIKA</span>
                            <p className="text-sm font-semibold text-green-900 mt-1">
                              {selectedScan.submission.sika_number}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Scan Information */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center mb-6">
                    <div className="p-3 bg-blue-100 rounded-xl mr-4">
                      <QrCodeIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-800">Detail Scan QR Code</h4>
                      <p className="text-sm text-gray-500">Informasi verifikasi dan validasi</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">Tanggal Scan</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {format(new Date(selectedScan.scanned_at), 'dd MMMM yyyy', { locale: id })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(selectedScan.scanned_at), "HH:mm:ss 'WIB'", { locale: id })}
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPinIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">Lokasi Scan</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedScan.scan_location || 'Lokasi tidak diketahui'}
                      </p>
                    </div>

                    {selectedScan.scanner_name && (
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <UserIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-600">Scanner</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedScan.scanner_name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* <div className="mt-4 bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircleIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">ID Scan</span>
                    </div>
                    <p className="text-xs font-mono text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                      {selectedScan.id}
                    </p>
                  </div> */}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedScan(null)}
                  className="px-6"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}