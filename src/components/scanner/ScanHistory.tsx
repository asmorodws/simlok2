'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useSession } from 'next-auth/react';
import { 
  QrCodeIcon, 
  EyeIcon, 
  ClockIcon, 
  UserIcon,
  BuildingOfficeIcon,
  DocumentIcon,
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { Alert } from '@/components/ui';
import { Button } from '@/components/ui';

interface ScanHistoryItem {
  id: string;
  scanned_at: string;
  scanner_name?: string;
  scan_location?: string;
  notes?: string;
  user: {
    id: string;
    officer_name: string;
    email: string;
    role: string;
  };
  submission: {
    id: string;
    simlok_number: string;
    vendor_name: string;
    officer_name: string;
    job_description: string;
    work_location: string;
    approval_status: string;
  };
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface ScanHistoryProps {
  submissionId?: string; // If provided, show scans for specific submission only
  className?: string;
}

interface ScanHistoryRef {
  closeDetailModal: () => void;
}

const ScanHistory = forwardRef<ScanHistoryRef, ScanHistoryProps>(function ScanHistory({ submissionId, className = '' }, ref) {
  const { data: session } = useSession();
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    closeDetailModal: () => {
      setSelectedScan(null);
    }
  }));

  // Fetch scan history
  const fetchScanHistory = async (offset = 0) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
      });

      if (submissionId) {
        params.append('submission_id', submissionId);
      }

      const response = await fetch(`/api/qr/verify?${params}`);
      const data = await response.json();

      if (response.ok) {
        setScans(data.scans);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to fetch scan history');
      }
    } catch (err) {
      console.error('Error fetching scan history:', err);
      setError('Network error while fetching scan history');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchScanHistory();
  }, [submissionId]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
  };

  // Get role badge color
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      ADMIN: { label: 'Admin', className: 'bg-purple-100 text-purple-800' },
      VERIFIER: { label: 'Verifier', className: 'bg-blue-100 text-blue-800' },
      VENDOR: { label: 'Vendor', className: 'bg-green-100 text-green-800' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || { 
      label: role, 
      className: 'bg-gray-100 text-gray-800' 
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Handle pagination
  const handlePrevious = () => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit);
    fetchScanHistory(newOffset);
  };

  const handleNext = () => {
    const newOffset = pagination.offset + pagination.limit;
    fetchScanHistory(newOffset);
  };

  if (!session) {
    return (
      <Alert
        variant="error"
        title="Akses Ditolak"
        message="Anda harus login untuk melihat history scan"
      />
    );
  }

  return (
    <div className={`scan-history ${className}`}>
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 text-blue-500 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {submissionId ? 'History Scan Submission' : 'History Scan QR Code'}
                </h2>
                <p className="text-sm text-gray-500">
                  {pagination.total} total scan records
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => fetchScanHistory(pagination.offset)}
              variant="secondary"
              size="sm"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error State */}
          {error && (
            <Alert
              variant="error"
              title="Error"
              message={error}
              className="mb-4"
            />
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
              <span className="text-gray-600">Loading scan history...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && scans.length === 0 && !error && (
            <div className="text-center py-12">
              <QrCodeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                Belum Ada Scan
              </h3>
              <p className="text-gray-500">
                {submissionId 
                  ? 'Submission ini belum pernah di-scan'
                  : 'Belum ada QR code yang di-scan'
                }
              </p>
            </div>
          )}

          {/* Scan History List */}
          {!isLoading && scans.length > 0 && (
            <div className="space-y-4">
              {scans.map((scan) => {
                const dateTime = formatDate(scan.scanned_at);
                
                return (
                  <div
                    key={scan.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Scan Info */}
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            <span className="font-medium">{dateTime.date}</span>
                            <span className="mx-2">•</span>
                            <span>{dateTime.time}</span>
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <UserIcon className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="font-medium text-gray-700">
                              {scan.scanner_name || scan.user.officer_name}
                            </span>
                            <span className="ml-2">
                              {getRoleBadge(scan.user.role)}
                            </span>
                          </div>
                        </div>

                        {/* Submission Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center">
                            <DocumentIcon className="h-4 w-4 text-blue-400 mr-2" />
                            <div>
                              <span className="text-gray-600">SIMLOK:</span>
                              <span className="ml-1 font-semibold text-blue-600">
                                {scan.submission.simlok_number}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            <BuildingOfficeIcon className="h-4 w-4 text-green-400 mr-2" />
                            <div>
                              <span className="text-gray-600">Vendor:</span>
                              <span className="ml-1 font-medium">
                                {scan.submission.vendor_name}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 text-purple-400 mr-2" />
                            <div>
                              <span className="text-gray-600">Petugas:</span>
                              <span className="ml-1 font-medium">
                                {scan.submission.officer_name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Job Description */}
                        <div className="text-sm">
                          <span className="text-gray-600">Pekerjaan:</span>
                          <span className="ml-1">{scan.submission.job_description}</span>
                        </div>

                        {/* Location */}
                        <div className="text-sm">
                          <span className="text-gray-600">Lokasi:</span>
                          <span className="ml-1">{scan.submission.work_location}</span>
                        </div>

                        {/* Scan Location */}
                        {scan.scan_location && (
                          <div className="flex items-center text-sm">
                            <MapPinIcon className="h-4 w-4 text-orange-400 mr-2" />
                            <div>
                              <span className="text-gray-600">Lokasi Scan:</span>
                              <span className="ml-1 font-medium text-orange-600">{scan.scan_location}</span>
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {scan.notes && (
                          <div className="text-sm bg-blue-50 p-3 rounded-md border-l-4 border-blue-200">
                            <span className="text-blue-700 font-medium">Catatan:</span>
                            <span className="ml-1 text-blue-600">{scan.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 ml-4">
                        <Button
                          onClick={() => setSelectedScan(scan)}
                          variant="secondary"
                          size="sm"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Detail
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && scans.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} scans
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handlePrevious}
                  disabled={pagination.offset === 0}
                  variant="secondary"
                  size="sm"
                >
                  <ChevronLeftIcon className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <Button
                  onClick={handleNext}
                  disabled={!pagination.hasMore}
                  variant="secondary"
                  size="sm"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedScan && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/30 transition-opacity"
              onClick={() => setSelectedScan(null)}
            />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Detail Scan QR Code
                </h3>
                
                <div className="space-y-4">
                  {/* Scan Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-sm font-medium text-gray-600">Waktu Scan</span>
                      <span className="text-gray-900">
                        {formatDate(selectedScan.scanned_at).date} - {formatDate(selectedScan.scanned_at).time}
                      </span>
                    </div>
                    
                    <div>
                      <span className="block text-sm font-medium text-gray-600">Di-scan Oleh</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">
                          {selectedScan.scanner_name || selectedScan.user.officer_name}
                        </span>
                        {getRoleBadge(selectedScan.user.role)}
                      </div>
                    </div>
                  </div>

                  {/* Submission Details */}
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Submission Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="block font-medium text-gray-600">SIMLOK Number</span>
                        <span className="text-blue-600 font-semibold">
                          {selectedScan.submission.simlok_number}
                        </span>
                      </div>
                      
                      <div>
                        <span className="block font-medium text-gray-600">Vendor</span>
                        <span className="text-gray-900">{selectedScan.submission.vendor_name}</span>
                      </div>
                      
                      <div>
                        <span className="block font-medium text-gray-600">Officer</span>
                        <span className="text-gray-900">{selectedScan.submission.officer_name}</span>
                      </div>
                      
                      <div>
                        <span className="block font-medium text-gray-600">Status</span>
                        <span className="text-gray-900">{selectedScan.submission.approval_status}</span>
                      </div>
                      
                      <div className="md:col-span-2">
                        <span className="block font-medium text-gray-600">Job Description</span>
                        <span className="text-gray-900">{selectedScan.submission.job_description}</span>
                      </div>
                      
                      <div className="md:col-span-2">
                        <span className="block font-medium text-gray-600">Work Location</span>
                        <span className="text-gray-900">{selectedScan.submission.work_location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Scan Location */}
                  {selectedScan.scan_location && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center">
                        <MapPinIcon className="h-5 w-5 text-orange-500 mr-2" />
                        <span className="block font-medium text-gray-600 mb-2">Scan Location</span>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-md text-sm text-orange-700 border-l-4 border-orange-200">
                        {selectedScan.scan_location}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedScan.notes && (
                    <div className="pt-4 border-t border-gray-200">
                      <span className="block font-medium text-gray-600 mb-2">Notes</span>
                      <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700">
                        {selectedScan.notes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => setSelectedScan(null)}
                    variant="secondary"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ScanHistory;
