'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import {
  XMarkIcon,
  CameraIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/button/Button';
import { Modal } from '@/components/ui/modal';
import ScanModal from './ScanModal';

interface ScanResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  scanned_at?: string;
  scanned_by?: string;
  scan_id?: string;
}

interface CameraQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan?: (result: string) => void;
  title?: string;
  description?: string;
}

export default function CameraQRScanner({ isOpen, onClose, onScan, title = "Scan Barcode/QR Code SIMLOK", description }: CameraQRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef<boolean>(false); // Track if scanning is active
  const scanIdRef = useRef<number>(0); // Unique ID for each scan session

  const resetScannerState = useCallback(() => {
    console.log('=== RESETTING SCANNER STATE ===');
    setScanResult(null);
    setIsModalOpen(false);
    setError(null);
    scanningRef.current = false;
    // Don't reset scanIdRef here as we want it to keep incrementing
  }, []);

  useEffect(() => {
    if (isOpen) {
      console.log('=== SCANNER OPENED ===');
      // Reset previous scan results when opening scanner
      resetScannerState();
      initializeScanner();
    } else {
      console.log('=== SCANNER CLOSED ===');
      stopScanner();
    }

    return () => {
      console.log('=== SCANNER CLEANUP ===');
      stopScanner();
    };
  }, [isOpen, resetScannerState]);

  const initializeScanner = async () => {
    try {
      console.log('=== INITIALIZING SCANNER ===');
      setError(null);
      setScanResult(null); // Clear any previous scan results
      setIsModalOpen(false); // Ensure modal is closed
      scanningRef.current = false; // Reset scanning state
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        console.log('Video stream attached');
      }

      codeReaderRef.current = new BrowserMultiFormatReader();
      console.log('BrowserMultiFormatReader initialized');
      
      setIsScanning(true);
      startScanning();
    } catch (err) {
      console.error('Failed to initialize scanner:', err);
      setError(err instanceof Error ? err.message : 'Failed to access camera');
    }
  };

  const startScanning = async () => {
    if (!videoRef.current) {
      console.error('Video element not available');
      return;
    }

    try {
      // Increment scan ID for this session
      scanIdRef.current += 1;
      const currentScanId = scanIdRef.current;
      
      console.log(`=== STARTING SCAN PROCESS (ID: ${currentScanId}) ===`);
      
      // Reset any previous scan result before starting new scan
      setScanResult(null);
      setIsModalOpen(false);
      
      // Always create a fresh code reader instance to avoid state issues
      if (codeReaderRef.current) {
        codeReaderRef.current = null;
      }
      codeReaderRef.current = new BrowserMultiFormatReader();
      console.log('Fresh BrowserMultiFormatReader created');
      
      scanningRef.current = true; // Mark scanning as active
      
      codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          // Check if this is still the current scan session
          if (scanIdRef.current !== currentScanId) {
            console.log(`Ignoring result from old scan session (${currentScanId} vs ${scanIdRef.current})`);
            return;
          }
          
          // Check if scanning is still active before processing
          if (!scanningRef.current) {
            console.log('Scanning stopped, ignoring result');
            return;
          }

          if (result) {
            console.log(`=== SCAN SUCCESS (ID: ${currentScanId}) ===`);
            console.log('Scanned text:', result.getText());
            scanningRef.current = false; // Stop scanning immediately
            handleScanSuccess(result.getText());
          }
          
          if (error && !(error instanceof NotFoundException)) {
            console.log('Scan error (non-critical):', error.message);
          }
        }
      );
    } catch (err) {
      console.error('Error during scanning:', err);
      setError('Scanning failed');
      scanningRef.current = false;
    }
  };

  const handleScanSuccess = async (scannedText: string) => {
    console.log('=== PROCESSING SCAN RESULT ===');
    console.log('Scanned text:', scannedText);
    
    try {
      // Stop all scanning activity immediately
      setIsScanning(false);
      scanningRef.current = false;

      const response = await fetch('/api/qr/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrData: scannedText,
          scanner_type: 'barcode_scanner'
        }),
      });

      console.log('API response status:', response.status);
      const result = await response.json();
      console.log('API response data:', result);
      console.log('API response data.data:', result.data);
      console.log('API response data.data.submission:', result.data?.submission);

      setScanResult(result);
      
      // Call onScan callback if provided
      if (onScan) {
        onScan(scannedText);
      }
      
      console.log('=== SETTING MODAL STATE ===');
      console.log('result.success:', result.success);
      console.log('About to set modal open to true');
      setIsModalOpen(true);
      console.log('Modal state should be open now');
      
    } catch (error) {
      console.error('Error verifying QR:', error);
      const errorResult = {
        success: false,
        error: 'Failed to verify barcode/QR code'
      };
      setScanResult(errorResult);
      setIsModalOpen(true);
    }
  };

  const stopCamera = () => {
    console.log('=== STOPPING CAMERA ===');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
      streamRef.current = null;
    }
  };

  const stopScanner = () => {
    console.log('=== STOPPING SCANNER ===');
    setIsScanning(false);
    scanningRef.current = false; // Stop scanning process
    
    if (codeReaderRef.current) {
      try {
        // Create a new instance to completely reset the scanner
        codeReaderRef.current = null;
        console.log('Code reader cleared');
      } catch (error) {
        console.log('Error clearing code reader:', error);
      }
    }
    
    stopCamera();
  };

  const handleClose = () => {
    console.log('=== CLOSING SCANNER ===');
    stopScanner();
    setScanResult(null);
    setError(null);
    onClose();
  };

  const handleModalClose = () => {
    console.log('=== CLOSING RESULT MODAL ===');
    setIsModalOpen(false);
    setScanResult(null);
    setError(null);
    
    // Restart scanning after modal closes if scanner is still open
    if (isOpen && videoRef.current) {
      console.log('=== RESTARTING SCANNER AFTER MODAL CLOSE ===');
      // Add delay to ensure state is properly reset and avoid race conditions
      setTimeout(() => {
        setIsScanning(true);
        scanningRef.current = false; // Reset scanning state
        startScanning();
      }, 300); // Increased delay for more stability
    }
  };

  console.log('=== RENDER STATE ===');
  console.log('isOpen:', isOpen);
  console.log('isScanning:', isScanning);
  console.log('scanResult:', scanResult);
  console.log('isModalOpen:', isModalOpen);

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose}>
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {title}
            </h2>
            {description && (
              <p className="text-gray-600 mb-4">
                {description}
              </p>
            )}
            
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-80 object-cover"
                />
                
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-green-500 w-64 h-64 rounded-lg animate-pulse">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500"></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {isScanning ? 'Scanning for barcode/QR code...' : 'Camera ready'}
                </p>
                
                <div className="flex gap-2">
                  {!isScanning ? (
                    <Button onClick={initializeScanner} startIcon={<CameraIcon className="h-4 w-4" />}>
                      Start Scanning
                    </Button>
                  ) : (
                    <Button onClick={stopScanner} variant="outline" startIcon={<StopIcon className="h-4 w-4" />}>
                      Stop Scanning
                    </Button>
                  )}
                  
                  <Button onClick={handleClose} variant="outline" startIcon={<XMarkIcon className="h-4 w-4" />}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {scanResult && (
        <ScanModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          result={scanResult}
        />
      )}
    </>
  );
}