'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { QrCodeIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import QrScanResultModal from './QrScanResultModal';
import QrScanErrorModal from './QrScanErrorModal';

interface ScanResult {
  submission?: any;
  scanned_at: string;
  scanned_by: string;
  scan_id: string;
}

interface ErrorDetails {
  type: 'network' | 'invalid' | 'unknown' | 'expired';
  message: string;
}

interface SecureQrScannerProps {
  onScanSuccess: (result: any) => void;
  onScanError: (error: string) => void;
  onClose?: () => void;
  className?: string;
  autoStart?: boolean;
}

const SecureQrScanner: React.FC<SecureQrScannerProps> = ({
  onScanSuccess,
  onScanError,
  onClose,
  className = '',
  autoStart = false,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails>({ type: 'unknown', message: '' });

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerElementId = useRef(`qr-scanner-${Date.now()}`);
  const isCleaningUpRef = useRef(false);

  // Process QR verification
  const processQrData = async (qrCodeMessage: string) => {
    if (isProcessing) return; // Prevent double processing
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/qr/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          qrData: qrCodeMessage,
          scannedAt: new Date().toISOString(),
          scannerName: 'SecureQrScanner'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to verify QR code');
      }

      if (result.success) {
        setScanResult(result.data);
        setShowSuccessModal(true);
        onScanSuccess(result.data);
        stopScanner();
      } else {
        throw new Error(result.message || 'QR verification failed');
      }
    } catch (error) {
      console.error('QR verification error:', error);
      let errorType: ErrorDetails['type'] = 'unknown';
      let errorMessage = 'An unexpected error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorType = 'network';
        } else if (error.message.includes('invalid') || error.message.includes('not found')) {
          errorType = 'invalid';
        }
      }

      setErrorDetails({ type: errorType, message: errorMessage });
      setShowErrorModal(true);
      onScanError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Clean stop scanner
  const stopScanner = () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (error) {
        console.warn('Error clearing scanner:', error);
      }
      scannerRef.current = null;
    }
    
    setIsScanning(false);
    setIsInitializing(false);
    setCameraError('');
    
    setTimeout(() => {
      isCleaningUpRef.current = false;
    }, 100);
  };

  // Initialize scanner with simplified approach
  const initializeScanner = async () => {
    if (isScanning || isInitializing || isCleaningUpRef.current) return;
    
    setIsInitializing(true);
    setCameraError('');

    try {
      // Test camera permissions first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: "environment" } }
        });
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Camera permission granted');
      } catch (permError) {
        console.warn('⚠️ Environment camera not available, trying default');
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        fallbackStream.getTracks().forEach(track => track.stop());
        console.log('✅ Default camera available');
      }

      // Wait for DOM element
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const element = document.getElementById(scannerElementId.current);
      if (!element) {
        throw new Error('Scanner container not found');
      }

      // Clear any existing content
      element.innerHTML = '';

      // Simplified scanner config for better mobile compatibility
      const config = {
        fps: 10,
        qrbox: { 
          width: Math.min(280, window.innerWidth - 40), 
          height: Math.min(280, window.innerWidth - 40) 
        },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: false,
        showZoomSliderIfSupported: false,
        rememberLastUsedCamera: false,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        verbose: false,
        disableFlip: false,
        videoConstraints: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      };

      const scanner = new Html5QrcodeScanner(scannerElementId.current, config, false);

      const onScanSuccess = (decodedText: string) => {
        console.log('📱 QR Code detected:', decodedText);
        processQrData(decodedText);
      };

      const onScanFailure = (_error: string) => {
        // Silent failures are normal during scanning
      };

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
      setIsScanning(true);
      
      // Hide camera selection UI after render
      setTimeout(() => {
        hideUnwantedElements();
      }, 1000);

    } catch (error) {
      console.error('❌ Scanner initialization failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
      setCameraError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  // Hide unwanted UI elements
  const hideUnwantedElements = () => {
    const container = document.getElementById(scannerElementId.current);
    if (!container) return;

    // Hide all form controls except video
    const unwantedSelectors = [
      'select',
      'input[type="file"]',
      'input[type="range"]',
      '.html5-qrcode-camera-selection',
      '.html5-qrcode-torch-button',
      '.html5-qrcode-zoom-slider'
    ];

    unwantedSelectors.forEach(selector => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
    });

    // Ensure video is visible
    const videos = container.querySelectorAll('video');
    videos.forEach(video => {
      (video as HTMLElement).style.display = 'block';
      (video as HTMLElement).style.width = '100%';
      (video as HTMLElement).style.borderRadius = '8px';
    });
  };

  // Auto-start effect
  useEffect(() => {
    if (autoStart && !isScanning && !isInitializing) {
      const timer = setTimeout(() => {
        initializeScanner();
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoStart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = () => {
    if (!isScanning && !isInitializing) {
      initializeScanner();
    }
  };

  return (
    <>
      {/* CSS untuk menyembunyikan elemen UI yang tidak diinginkan */}
      <style jsx global>{`
        #${scannerElementId.current} select,
        #${scannerElementId.current} input[type="file"],
        #${scannerElementId.current} input[type="range"],
        #${scannerElementId.current} .html5-qrcode-camera-selection,
        #${scannerElementId.current} .html5-qrcode-torch-button,
        #${scannerElementId.current} .html5-qrcode-zoom-slider {
          display: none !important;
        }
        
        #${scannerElementId.current} video {
          width: 100% !important;
          height: auto !important;
          border-radius: 8px !important;
          background: #000 !important;
        }
        
        #${scannerElementId.current} canvas {
          border-radius: 8px !important;
        }
      `}</style>

      <div className={`bg-white rounded-lg shadow-lg p-4 max-w-md mx-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <QrCodeIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">QR Scanner</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Status Messages */}
      {cameraError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm mb-2">{cameraError}</p>
          <Button
            onClick={startScanner}
            size="sm"
            variant="outline"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {isProcessing && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-sm">Memproses QR code...</p>
        </div>
      )}

      {/* Scanner Container */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        <div 
          id={scannerElementId.current}
          className="min-h-[280px] w-full"
        />
        
        {/* Loading State */}
        {(isInitializing || (autoStart && !isScanning && !cameraError)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">Mempersiapkan kamera...</p>
            </div>
          </div>
        )}

        {/* Manual Start State */}
        {!autoStart && !isScanning && !isInitializing && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <QrCodeIcon className="h-16 w-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 text-sm mb-4">Tap untuk memulai scanning</p>
              <Button 
                onClick={startScanner}
                className="px-6 py-2"
              >
                Mulai Scanner
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {isScanning && (
        <div className="mt-4 flex justify-center space-x-3">
          <Button
            onClick={stopScanner}
            variant="outline"
            size="sm"
          >
            Berhenti
          </Button>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-3 text-center">
        <p className="text-xs text-gray-500">
          Arahkan kamera ke QR code yang ingin discan
        </p>
      </div>

      {/* Success Modal */}
      {showSuccessModal && scanResult && (
        <QrScanResultModal
          isOpen={showSuccessModal}
          submission={scanResult.submission || null}
          scanTime={scanResult.scanned_at}
          scannedBy={scanResult.scanned_by}
          scanId={scanResult.scan_id}
          onClose={() => {
            setShowSuccessModal(false);
            setScanResult(null);
          }}
          onScanAnother={() => {
            setShowSuccessModal(false);
            setScanResult(null);
            startScanner();
          }}
        />
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <QrScanErrorModal
          isOpen={showErrorModal}
          errorMessage={errorDetails.message}
          errorType={errorDetails.type}
          onClose={() => {
            setShowErrorModal(false);
            setErrorDetails({ type: 'unknown', message: '' });
          }}
          onRetry={() => {
            setShowErrorModal(false);
            setErrorDetails({ type: 'unknown', message: '' });
            startScanner();
          }}
        />
      )}
      </div>
    </>
  );
};

export default SecureQrScanner;
