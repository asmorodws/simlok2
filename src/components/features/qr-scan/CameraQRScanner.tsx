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

import ScanModal from './ScanModal';
import type { ScanResult } from '@/types';

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
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track cleanup timeout

  // Debug utility to check camera status
  const debugCameraStatus = useCallback(() => {
    console.log('=== CAMERA DEBUG STATUS ===');
    console.log('Stream active:', !!streamRef.current);
    console.log('Video element srcObject:', !!videoRef.current?.srcObject);
    console.log('Scanning active:', scanningRef.current);
    console.log('IsScanning state:', isScanning);
    console.log('Code reader active:', !!codeReaderRef.current);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track, index) => {
        console.log(`Track ${index}: ${track.kind}, state: ${track.readyState}, enabled: ${track.enabled}`);
      });
    }
    console.log('=========================');
  }, [isScanning]);



  useEffect(() => {
    if (isOpen) {
      console.log('=== SCANNER OPENED ===');
      // Only initialize scanner, don't reset modal state if already showing success
      initializeScanner();
    } else {
      console.log('=== SCANNER CLOSED ===');
      stopScanner();
    }

    return () => {
      console.log('=== SCANNER CLEANUP (UNMOUNT) ===');
      // Aggressive cleanup on unmount
      setIsScanning(false);
      scanningRef.current = false;
      
      // Force stop all media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
        streamRef.current = null;
      }
      
      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      // Clear code reader
      codeReaderRef.current = null;
      
      // Clear any pending timeouts
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
      
      console.log('Scanner cleanup completed');
    };
  }, [isOpen]); // Removed resetScannerState from dependency to prevent unnecessary resets

  const initializeScanner = async () => {
    try {
      console.log('=== INITIALIZING SCANNER ===');
      
      // Prevent multiple initialization
      if (streamRef.current || isScanning) {
        console.log('Scanner already initialized or initializing, skipping...');
        return;
      }
      
      // Clean up any existing resources first
      stopScanner();
      
      setError(null);
      // Don't reset scan result and modal state if modal is currently showing success
      if (!isModalOpen) {
        setScanResult(null); // Only clear if modal is not open
        setIsModalOpen(false);
      }
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
      
      // Don't reset modal state if success modal is currently being shown
      if (!isModalOpen || !scanResult?.success) {
        setScanResult(null);
        setIsModalOpen(false);
      }
      
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

      // Set scan result first
      setScanResult(result);
      
      console.log('=== SETTING MODAL STATE ===');
      console.log('result.success:', result.success);
      console.log('About to set modal open to true');
      
      // Immediately show modal for better UX
      setIsModalOpen(true);
      console.log('Modal state set to open immediately');
      
      // Call onScan callback after modal is set (if provided)
      if (onScan) {
        onScan(scannedText);
      }
      
      // Dispatch refresh event for table updates (now safe since no loading state)
      if (result.success) {
        console.log('Scan successful, dispatching silent refresh event...');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('verifier-scan-refresh'));
          console.log('verifier-scan-refresh event dispatched (silent mode)');
        }, 200); // Quick refresh since it won't interfere with modal
      }
      
    } catch (error) {
      console.error('Error verifying QR:', error);
      const errorResult = {
        success: false,
        error: 'Failed to verify barcode/QR code'
      };
      setScanResult(errorResult);
      
      // Show error modal immediately too
      setIsModalOpen(true);
      console.log('Error modal state set to open immediately');
    }
  };

  const stopCamera = () => {
    console.log('=== STOPPING CAMERA ===');
    
    // Stop all video tracks
    if (streamRef.current) {
      console.log('Stopping media stream tracks...');
      streamRef.current.getTracks().forEach((track, index) => {
        console.log(`Stopping track ${index}: ${track.kind} (${track.readyState})`);
        track.stop();
        console.log(`Track ${index} stopped, new state: ${track.readyState}`);
      });
      streamRef.current = null;
    }
    
    // Clear video element source
    if (videoRef.current) {
      console.log('Clearing video element...');
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Force reload to clear any cached source
      console.log('Video element cleared');
    }
  };

  const stopScanner = () => {
    console.log('=== STOPPING SCANNER ===');
    
    // First stop scanning flag to prevent new scan attempts
    setIsScanning(false);
    scanningRef.current = false;
    
    // Stop the code reader properly
    if (codeReaderRef.current) {
      try {
        console.log('Destroying code reader...');
        // Simply clear the reference to stop all operations
        codeReaderRef.current = null;
        console.log('Code reader reference cleared');
      } catch (error) {
        console.log('Error clearing code reader reference:', error);
      }
    }
    
    // Stop camera after code reader cleanup
    stopCamera();
    
    console.log('Scanner stop completed');
  };

  const handleClose = () => {
    console.log('=== CLOSING SCANNER ===');
    
    // Debug camera status before closing
    debugCameraStatus();
    
    // Clear any pending cleanup timeouts
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
    
    // Stop scanner first
    stopScanner();
    
    // Reset all states
    setScanResult(null);
    setError(null);
    setIsModalOpen(false);
    
    // Wait a bit to ensure cleanup is complete before calling onClose
    cleanupTimeoutRef.current = setTimeout(() => {
      console.log('Calling onClose after cleanup');
      debugCameraStatus(); // Debug after cleanup
      onClose();
    }, 100);
  };

  const handleModalClose = () => {
    console.log('=== CLOSING RESULT MODAL ===');
    
    // Clear modal state first
    setIsModalOpen(false);
    setScanResult(null);
    setError(null);
    
    // No need to dispatch refresh here anymore - already handled after scan
    
    // Wait for modal to fully close before restarting scanner
    setTimeout(() => {
      // Restart scanning after modal closes if scanner is still open
      if (isOpen && videoRef.current && streamRef.current) {
        console.log('=== RESTARTING SCANNER AFTER MODAL CLOSE ===');
        // Additional delay to ensure all state changes are complete
        setTimeout(() => {
          // Triple check if scanner is still open and stream is still active
          if (isOpen && streamRef.current && !scanningRef.current && !isScanning) {
            console.log('Restarting scan process...');
            setIsScanning(true);
            // Reset scanning state before starting
            scanningRef.current = false;
            
            // Start scanning without resetting modal state again
            if (!videoRef.current) {
              console.error('Video element not available');
              return;
            }

            // Increment scan ID for this session
            scanIdRef.current += 1;
            const currentScanId = scanIdRef.current;
            
            console.log(`=== RESTARTING SCAN PROCESS (ID: ${currentScanId}) ===`);
            
            // Create fresh code reader instance
            if (codeReaderRef.current) {
              codeReaderRef.current = null;
            }
            codeReaderRef.current = new BrowserMultiFormatReader();
            console.log('Fresh BrowserMultiFormatReader created for restart');
            
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
          } else {
            console.log('Scanner closed or already scanning, skipping restart - isOpen:', isOpen, 'scanning:', scanningRef.current, 'isScanning:', isScanning);
          }
        }, 200);
      } else {
        console.log('Scanner not available for restart - isOpen:', isOpen, 'videoRef:', !!videoRef.current, 'stream:', !!streamRef.current);
      }
    }, 100);
  };

  console.log('=== RENDER STATE ===');
  console.log('isOpen:', isOpen);
  console.log('isScanning:', isScanning);
  console.log('scanResult:', scanResult);
  console.log('isModalOpen:', isModalOpen);

  return (
    <>
      {/* Custom modal with full black background for camera scanner */}
      {isOpen && (
        <div className="fixed inset-0 z-[99] bg-black/50 flex items-center justify-center p-4">
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
                <div className="text-sm text-gray-600">
                  <p>{isScanning ? 'Scanning for barcode/QR code...' : 'Camera ready'}</p>
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Stream: {streamRef.current ? '✅' : '❌'} | 
                      Scanner: {scanningRef.current ? '🔄' : '⏹️'} | 
                      Tracks: {streamRef.current?.getTracks().length || 0}
                    </p>
                  )}
                </div>
                
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
        </div>
      )}

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