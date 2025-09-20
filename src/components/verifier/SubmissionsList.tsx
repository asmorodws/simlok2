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
  DocumentArrowDownIcon
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

export default function SubmissionsList() {
  const { showError } = useToast();
  
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'ALL',
    dateRange: 'ALL',
    search: ''
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
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
        setSubmissions(data.submissions || []);
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
      
    } catch (error) {
      console.error('Error processing barcode:', error);
      showError('Error', 'Gagal memproses QR Code');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Daftar SIMLOK
          </h1>
          <p className="text-gray-600">
            Total: {pagination.total.toLocaleString()} submissions
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={() => setScannerOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <QrCodeIcon className="w-4 h-4 mr-2" />
            Scan QR
          </Button>
          
          <Button
            onClick={() => window.location.href = '/api/verifier/export'}
            variant="outline"
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pencarian
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Cari nomor SIMLOK, vendor, atau deskripsi..."
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange({ status: e.target.value as FilterOptions['status'] })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Periode
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange({ dateRange: e.target.value as FilterOptions['dateRange'] })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Semua Periode</option>
              <option value="TODAY">Hari Ini</option>
              <option value="WEEK">Minggu Ini</option>
              <option value="MONTH">Bulan Ini</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-white shadow rounded-lg">
        {loading && pagination.offset === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Tidak ada submissions
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Tidak ada submissions yang sesuai dengan filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SIMLOK
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pekerjaan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {submission.simlok_number || 'Belum ada nomor'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {submission.officer_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {submission.vendor_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.work_location}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {submission.job_description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(submission.approval_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(submission.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        onClick={() => window.location.href = `/verifier/submissions/${submission.id}`}
                        variant="outline"
                        size="sm"
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More */}
        {pagination.hasMore && submissions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Button
              onClick={loadMore}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
            </Button>
          </div>
        )}
      </div>

      {/* QR Code Scanner */}
      {scannerOpen && (
        <CameraQRScanner
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleScanResult}
        />
      )}
    </div>
  );
}
