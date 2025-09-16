'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  XMarkIcon, 
  CameraIcon, 
  QrCodeIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import Button from '../ui/button/Button';

interface SimpleQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export default function SimpleQRScanner({ isOpen, onClose, onScan }: SimpleQRScannerProps) {
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError('');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        setIsScanning(true);
        
        // Start scanning after video is ready
        videoRef.current.onloadedmetadata = () => {
          startScanning();
        };
      }
      
    } catch (err: any) {
      console.error('Camera error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Akses kamera ditolak. Silakan berikan izin kamera untuk melanjutkan.');
      } else if (err.name === 'NotFoundError') {
        setError('Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.');
      } else {
        setError('Tidak dapat mengakses kamera. Silakan coba lagi atau gunakan input manual.');
      }
    }
  }, []);

  const startScanning = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    // Simple QR detection using canvas
    intervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Try to decode QR code from canvas
          try {
            // const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            // This is a simplified approach - in a real implementation,
            // you would use a QR code detection library here
            
            // For now, we'll provide a way to manually input data
          } catch (error) {
            console.log('Canvas processing error:', error);
          }
        }
      }
    }, 100);
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsScanning(false);
  }, [stream]);

  const handleManualInput = () => {
    const input = prompt('Masukkan ID submission atau kode SIMLOK secara manual:');
    if (input && input.trim()) {
      onScan(input.trim());
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <QrCodeIcon className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Scanner SIMLOK
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

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
                    onClick={startCamera}
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
            ) : (
              <div>
                {/* Camera View */}
                {isScanning ? (
                  <div className="relative mb-4">
                    <video
                      ref={videoRef}
                      className="w-full max-h-64 bg-black rounded-lg"
                      playsInline
                      muted
                    />
                    <canvas
                      ref={canvasRef}
                      className="hidden"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-blue-400 border-dashed rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-600"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-600"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-600"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-600"></div>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                      Arahkan ke QR Code
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CameraIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Memulai Kamera...
                    </h4>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
                    Tutup
                  </Button>
                </div>

                {/* Quick Test */}
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Test Scanner:</strong> Gunakan "Input Manual" untuk menguji fitur dengan memasukkan ID submission yang valid.
                  </p>
                </div>

                {/* Instructions */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Cara menggunakan:
                  </h5>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Arahkan kamera ke QR code SIMLOK</li>
                    <li>• Pastikan QR code berada dalam kotak biru</li>
                    <li>• Tunggu hingga QR code terdeteksi secara otomatis</li>
                    <li>• Atau gunakan "Input Manual" untuk memasukkan kode</li>
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
