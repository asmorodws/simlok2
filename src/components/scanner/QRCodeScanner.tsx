'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { 
  XMarkIcon, 
  CameraIcon, 
  QrCodeIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import Button from '../ui/button/Button';

interface QRCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export default function QRCodeScanner({ isOpen, onClose, onScan }: QRCodeScannerProps) {
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      hasInitialized.current = true;
      requestCameraAndStartScanning();
    } else if (!isOpen) {
      cleanupScanner();
      hasInitialized.current = false;
    }

    return () => {
      if (!isOpen) {
        cleanupScanner();
      }
    };
  }, [isOpen]);

  const requestCameraAndStartScanning = async () => {
    try {
      // Request camera permission first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // prefer back camera
        } 
      });
      
      // Stop the stream immediately since we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionGranted(true);
      setError('');
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        initializeScanner();
      }, 100);
      
    } catch (err: any) {
      console.error('Camera permission error:', err);
      setPermissionGranted(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Akses kamera ditolak. Silakan berikan izin kamera untuk melanjutkan scanning.');
      } else if (err.name === 'NotFoundError') {
        setError('Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.');
      } else {
        setError('Tidak dapat mengakses kamera. Silakan coba lagi atau gunakan input manual.');
      }
    }
  };

  const initializeScanner = () => {
    try {
      cleanupScanner();

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
        videoConstraints: {
          facingMode: 'environment'
        }
      };

      scannerRef.current = new Html5QrcodeScanner(
        'qr-reader-container',
        config,
        false
      );

      scannerRef.current.render(
        (decodedText: string) => {
          console.log('QR Code detected:', decodedText);
          handleScanSuccess(decodedText);
        },
        (errorMessage: string) => {
          // Only log actual errors, not scanning failures
          if (!errorMessage.includes('No MultiFormat Readers') && 
              !errorMessage.includes('NotFoundException')) {
            console.warn('QR Scan error:', errorMessage);
          }
        }
      );

      setIsScanning(true);
      setError('');
      
    } catch (error) {
      console.error('Failed to initialize scanner:', error);
      setError('Gagal menginisialisasi scanner. Silakan coba lagi.');
    }
  };

  const cleanupScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (error) {
        console.log('Scanner cleanup error:', error);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanSuccess = (decodedText: string) => {
    cleanupScanner();
    onScan(decodedText);
  };

  const handleManualInput = () => {
    const input = prompt('Masukkan kode SIMLOK atau ID submission secara manual:');
    if (input && input.trim()) {
      onScan(input.trim());
    }
  };

  const handleRetry = () => {
    setError('');
    setPermissionGranted(false);
    hasInitialized.current = false;
    requestCameraAndStartScanning();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <QrCodeIcon className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Scan QR Code SIMLOK
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Error State */}
            {error ? (
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Scanner Tidak Tersedia
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {error}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleRetry}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CameraIcon className="w-4 h-4 mr-2" />
                    Coba Lagi
                  </Button>
                  <Button
                    onClick={handleManualInput}
                    variant="outline"
                  >
                    Input Manual
                  </Button>
                </div>
              </div>
            ) : !permissionGranted ? (
              /* Permission Request */
              <div className="text-center py-8">
                <CameraIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Meminta Izin Kamera
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Aplikasi akan meminta izin untuk mengakses kamera...
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              /* Scanner Interface */
              <div>
                {/* Scanner Container */}
                <div className="relative mb-4">
                  <div 
                    id="qr-reader-container"
                    className="w-full"
                  ></div>
                </div>

                {isScanning && (
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Arahkan kamera ke QR Code SIMLOK
                    </p>
                    
                    {/* Visual Guide */}
                    <div className="relative mx-auto w-48 h-48 mb-4 border-2 border-dashed border-blue-400 rounded-lg">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-600"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-600"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-600"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-600"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <QrCodeIcon className="w-8 h-8 text-blue-400" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleManualInput}
                    variant="outline"
                    className="flex-1"
                  >
                    Input Manual
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1"
                  >
                    Batal
                  </Button>
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Tips untuk scan yang optimal:
                  </h5>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Pastikan QR code terlihat jelas dalam kotak scanner</li>
                    <li>• Jaga jarak sekitar 15-30 cm dari QR code</li>
                    <li>• Pastikan pencahayaan yang cukup</li>
                    <li>• Hindari getaran atau gerakan berlebihan</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
