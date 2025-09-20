'use client';

import React from 'react';
import { X, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface QrScanErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: string;
  message?: string | undefined;
  errorType?: 'invalid' | 'expired' | 'network' | 'unknown';
  onRetry?: () => void;
}

const QrScanErrorModal: React.FC<QrScanErrorModalProps> = ({
  isOpen,
  onClose,
  error: errorMessage,
  message,
  errorType = 'unknown',
  onRetry
}) => {
  if (!isOpen) return null;

  const getErrorIcon = () => {
    switch (errorType) {
      case 'invalid':
        return <XCircle className="h-12 w-12 text-red-500" />;
      case 'expired':
        return <AlertTriangle className="h-12 w-12 text-orange-500" />;
      case 'network':
        return <AlertTriangle className="h-12 w-12 text-yellow-500" />;
      default:
        return <XCircle className="h-12 w-12 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'invalid':
        return 'QR Code Tidak Valid';
      case 'expired':
        return 'QR Code Kedaluwarsa';
      case 'network':
        return 'Masalah Koneksi';
      default:
        return 'Scan Gagal';
    }
  };

  const getErrorDescription = () => {
    switch (errorType) {
      case 'invalid':
        return 'QR Code yang dipindai tidak valid atau bukan QR Code SIMLOK.';
      case 'expired':
        return 'QR Code yang dipindai sudah kedaluwarsa. Silakan minta QR Code baru.';
      case 'network':
        return 'Terjadi masalah koneksi saat memverifikasi QR Code.';
      default:
        return 'Terjadi kesalahan saat memindai QR Code.';
    }
  };

  const getHeaderColor = () => {
    switch (errorType) {
      case 'expired':
        return 'bg-orange-50 border-orange-200';
      case 'network':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${getHeaderColor()}`}>
          <div className="flex items-center space-x-2">
            {getErrorIcon()}
            <h2 className="text-lg font-semibold text-gray-800">{getErrorTitle()}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error Description */}
          <div className="text-center">
            <p className="text-gray-600 mb-2">{message || getErrorDescription()}</p>
            {errorMessage && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-gray-700 font-mono">{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Solutions/Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Tips:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {errorType === 'invalid' && (
                <>
                  <li>• Pastikan QR Code adalah QR Code SIMLOK yang valid</li>
                  <li>• Pastikan QR Code tidak rusak atau terpotong</li>
                  <li>• Coba posisikan QR Code lebih dekat ke kamera</li>
                </>
              )}
              {errorType === 'expired' && (
                <>
                  <li>• Minta QR Code baru dari sistem</li>
                  <li>• Pastikan permohonan masih dalam periode yang valid</li>
                </>
              )}
              {errorType === 'network' && (
                <>
                  <li>• Periksa koneksi internet</li>
                  <li>• Coba lagi dalam beberapa saat</li>
                </>
              )}
              {errorType === 'unknown' && (
                <>
                  <li>• Coba scan ulang QR Code</li>
                  <li>• Pastikan kamera dapat membaca QR Code dengan jelas</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Coba Scan Lagi</span>
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

export default QrScanErrorModal;
