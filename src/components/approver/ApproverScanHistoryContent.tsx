'use client';

import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  QrCodeIcon,
  UserIcon,
  DocumentTextIcon,
  ClockIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow, format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button, Badge, Alert } from '@/components/ui';

interface QrScan {
  id: string;
  submission_id: string;
  scanned_by: string;
  scanned_at: string;
  scanner_name?: string;
  notes?: string;
  submission: {
    id: string;
    simlok_number: string;
    vendor_name: string;
    job_description: string;
    review_status: string;
    final_status: string;
  };
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  verifier: string;
  submissionId: string;
}

export default function ApproverScanHistoryContent() {
  const [scans, setScans] = useState<QrScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    verifier: '',
    submissionId: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedScan, setSelectedScan] = useState<QrScan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const pageSize = 15;

  const fetchScanHistory = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.verifier && { verifier: filters.verifier }),
        ...(filters.submissionId && { submissionId: filters.submissionId }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/scan-history?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch scan history');
      }

      const data = await response.json();
      setScans(data.scans || []);
      setTotalPages(Math.ceil((data.total || 0) / pageSize));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchScanHistory();
    }, 300);

    return () => clearTimeout(timer);
  }, [currentPage, searchTerm]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchScanHistory();
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      verifier: '',
      submissionId: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
    fetchScanHistory();
  };

  const getStatusBadge = (status: string, type: 'review' | 'final') => {
    if (type === 'review') {
      switch (status) {
        case 'PENDING_REVIEW':
          return <Badge variant="warning">Menunggu Review</Badge>;
        case 'MEETS_REQUIREMENTS':
          return <Badge variant="success">Memenuhi Syarat</Badge>;
        case 'NOT_MEETS_REQUIREMENTS':
          return <Badge variant="error">Tidak Memenuhi Syarat</Badge>;
        default:
          return null;
      }
    } else {
      switch (status) {
        case 'PENDING_APPROVAL':
          return <Badge variant="warning">Menunggu Persetujuan</Badge>;
        case 'APPROVED':
          return <Badge variant="success">Disetujui</Badge>;
        case 'REJECTED':
          return <Badge variant="error">Ditolak</Badge>;
        default:
          return null;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <QrCodeIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manajemen Riwayat Scan</h2>
              <p className="text-sm text-gray-500">Pantau aktivitas scan QR code oleh verifikator</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'secondary' : 'primary'}
              className="flex items-center space-x-2"
            >
              <FunnelIcon className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nomor simlok, nama perusahaan, atau verifikator..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4">
            <form onSubmit={handleFilterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Dari
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Sampai
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Verifikator
                  </label>
                  <input
                    type="text"
                    value={filters.verifier}
                    onChange={(e) => setFilters(prev => ({ ...prev, verifier: e.target.value }))}
                    placeholder="Filter berdasarkan nama verifikator..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor Simlok
                  </label>
                  <input
                    type="text"
                    value={filters.submissionId}
                    onChange={(e) => setFilters(prev => ({ ...prev, submissionId: e.target.value }))}
                    placeholder="Filter berdasarkan nomor simlok..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button type="submit" className="flex items-center space-x-2">
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  <span>Terapkan Filter</span>
                </Button>
                
                <Button 
                  type="button"
                  variant="secondary"
                  onClick={resetFilters}
                >
                  Reset
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" title="Error" message={error} />
      )}

      {/* Scan History Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-20 h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : scans.length === 0 ? (
          <div className="p-12 text-center">
            <QrCodeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scan history found</h3>
            <p className="text-gray-500">No QR code scans match your current filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pengajuan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verifikator
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waktu Scan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded-lg mr-3">
                            <DocumentTextIcon className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {scan.submission.simlok_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              {scan.submission.vendor_name}
                            </div>
                            <div className="text-xs text-gray-400 truncate max-w-xs">
                              {scan.submission.job_description}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-1.5 bg-blue-100 rounded-full mr-3">
                            <UserIcon className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {scan.user.full_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {scan.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="font-medium">
                              {format(new Date(scan.scanned_at), 'dd/MM/yyyy HH:mm', { locale: id })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(scan.scanned_at), { locale: id, addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(scan.submission.review_status, 'review')}
                          {getStatusBadge(scan.submission.final_status, 'final')}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => setSelectedScan(scan)}
                          variant="secondary"
                          size="sm"
                          className="flex items-center space-x-1"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span>Detail</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <p className="text-sm text-gray-700">
                      Menampilkan halaman <span className="font-medium">{currentPage}</span> dari{' '}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      variant="secondary"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      <span>Sebelumnya</span>
                    </Button>
                    
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      variant="secondary"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <span>Selanjutnya</span>
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedScan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Informasi Detail Scan</h3>
                <button
                  onClick={() => setSelectedScan(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Informasi Pengajuan</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nomor Simlok:</span>
                      <span className="font-medium">{selectedScan.submission.simlok_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Perusahaan:</span>
                      <span className="font-medium">{selectedScan.submission.vendor_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Deskripsi Pekerjaan:</span>
                      <span className="font-medium">{selectedScan.submission.job_description}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Informasi Verifikator</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nama:</span>
                      <span className="font-medium">{selectedScan.user.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium">{selectedScan.user.email}</span>
                    </div>
                    
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Detail Scan</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Waktu Scan:</span>
                    <span className="font-medium">
                      {format(new Date(selectedScan.scanned_at), 'dd/MM/yyyy HH:mm:ss', { locale: id })}
                    </span>
                  </div>
                  {selectedScan.scanner_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Scanner Name:</span>
                      <span className="font-medium">{selectedScan.scanner_name}</span>
                    </div>
                  )}
                  {selectedScan.notes && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Notes:</span>
                      <p className="mt-1 font-medium">{selectedScan.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Current Status</h4>
                <div className="flex flex-wrap gap-3">
                  {getStatusBadge(selectedScan.submission.review_status, 'review')}
                  {getStatusBadge(selectedScan.submission.final_status, 'final')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}