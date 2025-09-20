'use client';

import React from 'react';
import { X, CheckCircle, User, Calendar, MapPin, QrCode } from 'lucide-react';

interface Submission {
  id: string;
  number: string;
  title: string;
  task: string;
  workers?: { name: string }[];
  vendor?: { name: string };
  location?: string;
  implementation_start_date?: string | null;
  implementation_end_date?: string | null;
  status: string;
}

interface ScanResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

interface QrScanResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ScanResult;
  submission?: Submission | null;
  scanTime?: string | undefined;
  scannedBy?: string | undefined;
  scanId?: string | undefined;
  onScanAnother?: () => void;
}

const QrScanResultModal: React.FC<QrScanResultModalProps> = ({
  isOpen,
  onClose,
  result,
  submission,
  scanTime,
  scannedBy,
  scanId,
  onScanAnother
}) => {
  // Extract submission from result if not provided directly
  const submissionData = submission || result.data?.submission;
  
  if (!isOpen || !result.success || !submissionData) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Tidak ditentukan';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Selesai';
      case 'in_progress':
        return 'Sedang Berlangsung';
      case 'pending':
        return 'Menunggu';
      default:
        return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-green-50">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h2 className="text-lg font-semibold text-green-800">QR Code Valid</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Scan Information */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="font-medium text-green-800 mb-2">Informasi Scan</h4>
            <div className="space-y-1 text-sm">
              {scanTime && (
                <div className="flex justify-between">
                  <span className="text-green-700">Waktu Scan:</span>
                  <span className="text-green-800 font-medium">{scanTime}</span>
                </div>
              )}
              {scannedBy && (
                <div className="flex justify-between">
                  <span className="text-green-700">Dipindai oleh:</span>
                  <span className="text-green-800 font-medium">{scannedBy}</span>
                </div>
              )}
              {scanId && (
                <div className="flex justify-between">
                  <span className="text-green-700">ID Scan:</span>
                  <span className="text-green-800 font-mono text-xs">{scanId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Submission Number */}
          <div className="text-center">
            <div className="text-sm text-gray-600">Nomor Permohonan</div>
            <div className="text-xl font-bold text-gray-900">{submissionData.number}</div>
          </div>

          {/* Status */}
          <div className="flex justify-center">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(submissionData.status)}`}>
              {getStatusText(submissionData.status)}
            </span>
          </div>

          {/* Title */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Judul Pekerjaan</div>
            <div className="text-gray-900">{submissionData.title}</div>
          </div>

          {/* Task */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Uraian Pekerjaan</div>
            <div className="text-gray-900 text-sm">{submissionData.task}</div>
          </div>

          {/* Vendor */}
          {submissionData.vendor && (
            <div className="flex items-start space-x-2">
              <User className="h-4 w-4 text-gray-500 mt-1" />
              <div>
                <div className="text-sm font-medium text-gray-700">Vendor</div>
                <div className="text-gray-900">{submissionData.vendor.name}</div>
              </div>
            </div>
          )}

          {/* Location */}
          {submissionData.location && (
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-gray-500 mt-1" />
              <div>
                <div className="text-sm font-medium text-gray-700">Lokasi</div>
                <div className="text-gray-900">{submissionData.location}</div>
              </div>
            </div>
          )}

          {/* Implementation Period */}
          <div className="flex items-start space-x-2">
            <Calendar className="h-4 w-4 text-gray-500 mt-1" />
            <div>
              <div className="text-sm font-medium text-gray-700">Periode Pelaksanaan</div>
              <div className="text-gray-900 text-sm">
                {formatDate(submissionData.implementation_start_date || null)} - {formatDate(submissionData.implementation_end_date || null)}
              </div>
            </div>
          </div>

          {/* Workers */}
          {submissionData.workers && submissionData.workers.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Pekerja</div>
              <div className="space-y-1">
                {submissionData.workers.map((worker: any, index: number) => (
                  <div key={index} className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded">
                    {worker.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
          {onScanAnother && (
            <button
              onClick={() => {
                onScanAnother();
                onClose();
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <QrCode className="h-4 w-4" />
              <span>Scan QR Code Lain</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrScanResultModal;
