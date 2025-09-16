'use client';

import { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCodeIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Alert from '@/components/ui/alert/Alert';
import Button from '@/components/ui/button/Button';

interface ScanResult {
  success: boolean;
  message: string;
  scan_id?: string;
  scanned_at?: string;
  scanned_by?: string;
  submission?: {
    id: string;
    simlok_number: string;
    vendor_name: string;
    officer_name: string;
    job_description: string;
    work_location: string;
    implementation: string;
    implementation_start_date?: string;
    implementation_end_date?: string;
    working_hours: string;
    work_facilities: string;
    worker_list: Array<{
      id: string;
      worker_name: string;
      worker_photo?: string;
    }>;
  };
}

interface SecureQrScannerProps {
  onScanSuccess?: (result: ScanResult) => void;
  onScanError?: (error: string) => void;
  className?: string;
  autoStart?: boolean;
}

export default function SecureQrScanner({
  onScanSuccess,
  onScanError,
  className = '',
  autoStart = false
}: SecureQrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>('success');
  const [cameraError, setCameraError] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Debug: use variables to prevent TypeScript errors
  void hasPermission;
  void isInitialized;
  void setIsInitialized;
  void showModal;
  void setShowModal;

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerElementId = `qr-scanner-${Math.random().toString(36).substr(2, 9)}`;

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugInfo(prev => [...prev.slice(-10), logMessage]); // Keep last 10 messages
  };

  const testCameraAccess = async () => {
    addDebugInfo('🧪 Testing camera access...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      addDebugInfo('✅ Camera access successful!');
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      addDebugInfo(`❌ Camera access failed: ${error.message}`);
      return false;
    }
  };

  const checkCameraDevices = async () => {
    addDebugInfo('📱 Checking camera devices...');
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      addDebugInfo(`📱 Found ${cameras.length} cameras`);
      cameras.forEach((camera, i) => {
        addDebugInfo(`  Camera ${i}: ${camera.label || 'Unknown'}`);
      });
      return cameras;
    } catch (error: any) {
      addDebugInfo(`❌ Failed to enumerate devices: ${error.message}`);
      return [];
    }
  };

  const startScanning = async () => {
    addDebugInfo('🎥 Starting scanner...');
    setCameraError('');
    
    // First test camera access
    const hasAccess = await testCameraAccess();
    if (!hasAccess) {
      setCameraError('❌ Tidak dapat mengakses kamera. Periksa permission browser.');
      return;
    }

    const scannerElement = document.getElementById(scannerElementId);
    if (!scannerElement) {
      addDebugInfo('❌ Scanner element not found');
      setCameraError('❌ Scanner element tidak ditemukan');
      return;
    }

    addDebugInfo('✅ Scanner element found');

    // Clear any existing scanner
    if (scannerRef.current) {
      addDebugInfo('🧹 Clearing existing scanner...');
      try {
        await scannerRef.current.clear();
      } catch (error) {
        addDebugInfo('⚠️ Error clearing scanner');
      }
    }

    const config = {
      fps: 10,
      qrbox: { width: 300, height: 300 },
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true,
      defaultZoomValueIfSupported: 2,
      rememberLastUsedCamera: true,
      useBarCodeDetectorIfSupported: true,
    };

    addDebugInfo('📝 Creating scanner with config');

    try {
      const scanner = new Html5QrcodeScanner(scannerElementId, config, false);
      scannerRef.current = scanner;

      addDebugInfo('🚀 Rendering scanner...');

      // Create a promise to track rendering
      const renderPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Scanner render timeout - kamera tidak muncul setelah 15 detik'));
        }, 15000);

        scanner.render(
          (decodedText) => {
            clearTimeout(timeout);
            addDebugInfo('📱 QR Code detected!');
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            if (!errorMessage.includes('No QR code found') && !errorMessage.includes('QR code parse error')) {
              addDebugInfo(`⚠️ QR scan error: ${errorMessage}`);
            }
          }
        );

        // Monitor scanner element changes
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              addDebugInfo('🔍 Scanner content added to DOM');
              
              const element = document.getElementById(scannerElementId);
              if (element) {
                addDebugInfo(`📊 Scanner stats: ${element.children.length} children, ${element.clientHeight}x${element.clientWidth}px`);
                
                const videos = element.querySelectorAll('video');
                addDebugInfo(`🎥 Video elements: ${videos.length}`);
                
                if (videos.length > 0) {
                  videos.forEach((video, i) => {
                    addDebugInfo(`📹 Video ${i}: ${video.videoWidth}x${video.videoHeight}, readyState: ${video.readyState}`);
                  });
                  
                  clearTimeout(timeout);
                  observer.disconnect();
                  resolve();
                }
              }
            }
          });
        });

        observer.observe(scannerElement, { childList: true, subtree: true });

        // Fallback: resolve after 5 seconds if content exists
        setTimeout(() => {
          const element = document.getElementById(scannerElementId);
          if (element && element.children.length > 0) {
            addDebugInfo('⏰ Timeout fallback - assuming scanner loaded');
            observer.disconnect();
            clearTimeout(timeout);
            resolve();
          }
        }, 5000);
      });

      await renderPromise;

      scannerElement.style.display = 'block';
      
      addDebugInfo('✅ Scanner started successfully');
      setIsScanning(true);
      setScanResult(null);
      setHasPermission(true);

    } catch (error) {
      addDebugInfo(`❌ Scanner error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      let errorMsg = '';
      
      if (error instanceof Error) {
        if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
          errorMsg = '❌ Akses kamera ditolak. Silakan izinkan akses kamera di browser.';
          setHasPermission(false);
        } else if (error.message.includes('NotFoundError')) {
          errorMsg = '❌ Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.';
        } else if (error.message.includes('NotReadableError')) {
          errorMsg = '❌ Kamera sedang digunakan aplikasi lain.';
        } else if (error.message.includes('timeout')) {
          errorMsg = '❌ Kamera tidak muncul dalam waktu yang diharapkan. Coba refresh halaman.';
        } else {
          errorMsg = `❌ Error: ${error.message}`;
        }
      } else {
        errorMsg = '❌ Gagal memulai scanner';
      }
      
      setCameraError(errorMsg);
      setAlertMessage(errorMsg);
      setAlertType('error');
      setShowAlert(true);
      
      setTimeout(() => setShowAlert(false), 8000);
    }
  };

  const stopScanning = () => {
    addDebugInfo('🛑 Stopping scanner...');
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    addDebugInfo('🔄 Processing scan result...');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/qr/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData: decodedText }),
      });

      const result = await response.json();
      setScanResult(result);

      if (result.success) {
        setAlertType('success');
        setAlertMessage('QR Code berhasil diverifikasi!');
        onScanSuccess?.(result);
      } else {
        setAlertType('error');
        setAlertMessage(result.message || 'QR Code tidak valid');
        onScanError?.(result.message || 'Invalid QR Code');
      }

      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);

      // Stop scanning after successful scan
      stopScanning();
      
    } catch (error) {
      addDebugInfo(`❌ Scan processing error: ${error instanceof Error ? error.message : 'Unknown'}`);
      setAlertType('error');
      setAlertMessage('Gagal memverifikasi QR Code');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
      onScanError?.('Verification failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString('id-ID');
  };

  // Auto-start effect
  useEffect(() => {
    if (autoStart) {
      addDebugInfo('🚀 Auto-starting scanner...');
      const timer = setTimeout(() => {
        startScanning();
      }, 1000);

      return () => clearTimeout(timer);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [autoStart]);

  return (
    <div className={`secure-qr-scanner ${className}`}>
      {/* Alert Notification */}
      {showAlert && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Alert
            variant={alertType}
            title={alertType === 'success' ? 'Scan Berhasil!' : 'Scan Gagal!'}
            message={alertMessage}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <QrCodeIcon className="h-6 w-6 text-blue-500 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Secure QR Scanner (Debug Mode)</h2>
        </div>

        {/* Debug Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Debug Log:</h3>
          <div className="max-h-40 overflow-y-auto text-xs font-mono bg-black text-green-400 p-2 rounded">
            {debugInfo.map((info, i) => (
              <div key={i}>{info}</div>
            ))}
          </div>
        </div>

        {/* Camera Test Controls */}
        <div className="space-y-4 mb-6">
          <div className="flex space-x-2">
            <Button
              onClick={async () => {
                const hasAccess = await testCameraAccess();
                alert(hasAccess ? '✅ Kamera berhasil diakses!' : '❌ Gagal mengakses kamera');
              }}
              variant="outline"
              size="sm"
            >
              🧪 Test Kamera
            </Button>
            
            <Button
              onClick={checkCameraDevices}
              variant="outline"
              size="sm"
            >
              📱 Cek Kamera
            </Button>

            <Button
              onClick={() => setDebugInfo([])}
              variant="outline"
              size="sm"
            >
              🧹 Clear Log
            </Button>
          </div>
        </div>

        {/* Camera Error State */}
        {cameraError && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center p-4 bg-red-50 rounded-lg border border-red-200">
              <XCircleIcon className="h-6 w-6 text-red-500 mr-3" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Error Kamera</h3>
                <p className="text-sm text-red-700">{cameraError}</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  setCameraError('');
                  setHasPermission(null);
                  startScanning();
                }}
                variant="primary"
                size="sm"
              >
                🔄 Coba Lagi
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                🔄 Refresh Halaman
              </Button>
            </div>
          </div>
        )}

        {/* Scanner Controls */}
        {!isScanning && !scanResult && !autoStart && !cameraError && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Klik tombol di bawah untuk memulai scanning QR Code
              </p>
            </div>

            <Button
              onClick={startScanning}
              variant="primary"
              size="lg"
              className="w-full"
            >
              <QrCodeIcon className="h-5 w-5 mr-2" />
              Mulai Scan QR Code
            </Button>
          </div>
        )}

        {/* Auto-start loading state */}
        {autoStart && !isScanning && !scanResult && !cameraError && (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
              <span className="text-blue-700">Mempersiapkan scanner...</span>
            </div>
            {/* Hidden scanner element for auto-start */}
            <div id={scannerElementId} className="w-full" style={{ display: 'none' }} />
          </div>
        )}

        {/* Scanner Element */}
        {isScanning && (
          <div className="space-y-4">
            <div id={scannerElementId} className="w-full min-h-[400px] border-2 border-dashed border-gray-300 rounded-lg" />
            
            {isProcessing && (
              <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                <span className="text-blue-700">Memverifikasi QR Code...</span>
              </div>
            )}
            
            <Button
              onClick={stopScanning}
              variant="secondary"
              className="w-full"
            >
              Stop Scanning
            </Button>
          </div>
        )}

        {/* Scan Result Display */}
        {scanResult && scanResult.success && scanResult.submission && (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3" />
              <div>
                <h3 className="font-semibold text-green-900">QR Code Valid!</h3>
                <p className="text-sm text-green-700">Scan berhasil pada {formatDate(scanResult.scanned_at)}</p>
              </div>
            </div>

            {/* Submission Details */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Submission</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">No. SIMLOK</label>
                  <p className="text-sm text-gray-900">{scanResult.submission.simlok_number}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vendor</label>
                  <p className="text-sm text-gray-900">{scanResult.submission.vendor_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Officer</label>
                  <p className="text-sm text-gray-900">{scanResult.submission.officer_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lokasi Kerja</label>
                  <p className="text-sm text-gray-900">{scanResult.submission.work_location}</p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Deskripsi Pekerjaan</label>
                  <p className="text-sm text-gray-900">{scanResult.submission.job_description}</p>
                </div>
              </div>
            </div>

            {/* Scan Again Button */}
            <Button
              onClick={() => {
                setScanResult(null);
                startScanning();
              }}
              variant="primary"
              className="w-full"
            >
              <QrCodeIcon className="h-5 w-5 mr-2" />
              Scan QR Code Lain
            </Button>
          </div>
        )}

        {/* Failed Scan Result */}
        {scanResult && !scanResult.success && (
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-red-50 rounded-lg border border-red-200">
              <XCircleIcon className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="font-semibold text-red-900">QR Code Tidak Valid</h3>
                <p className="text-sm text-red-700">{scanResult.message}</p>
              </div>
            </div>

            <Button
              onClick={() => {
                setScanResult(null);
                startScanning();
              }}
              variant="primary"
              className="w-full"
            >
              <QrCodeIcon className="h-5 w-5 mr-2" />
              Coba Scan Lagi
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
