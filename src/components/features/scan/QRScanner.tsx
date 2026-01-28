'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { 
  QrCodeIcon, 
  CameraIcon, 
  XMarkIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import jsQR from 'jsqr';

interface ScanResult {
  success: boolean;
  submission?: {
    id: string;
    simlok_number: string;
    vendor_name: string;
    work_location: string;
    implementation_start_date: string | null;
    implementation_end_date: string | null;
  };
  scan?: {
    id: string;
    scanned_at: string;
  };
  error?: string;
  message?: string;
}

export default function QRScanner() {
  const { data: session } = useSession();
  const [scanning, setScanning] = useState(false);
  const [scanLocation, setScanLocation] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const hasPermission = ['VERIFIER', 'ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role || '');

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    setError(null);
    setResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          scanIntervalRef.current = setInterval(() => {
            captureAndScan();
          }, 300);
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.');
      toast.error('Akses kamera ditolak');
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  };

  const captureAndScan = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      handleQRCodeDetected(code.data);
    }
  };

  const handleQRCodeDetected = async (qrData: string) => {
    stopScanning();

    try {
      const response = await fetch('/api/qr/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          qrData,
          scanLocation: scanLocation || null 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        toast.success('QR code berhasil di-scan!');
      } else {
        const errorMsg = data.error || data.message || 'QR code tidak valid';
        setError(errorMsg);
        toast.error(errorMsg);
        setResult({ success: false, error: errorMsg });
      }
    } catch (err) {
      const errorMsg = 'Gagal memproses QR code';
      setError(errorMsg);
      toast.error(errorMsg);
      setResult({ success: false, error: errorMsg });
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  if (!hasPermission) {
    return (
      <div className="text-center py-12">
        <QrCodeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Akses Ditolak</h2>
        <p className="text-gray-600">Anda tidak memiliki izin untuk scan QR code.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scan QR Code</h1>
        <p className="text-gray-600 mt-1">Scan QR code SIMLOK untuk verifikasi</p>
      </div>

      {!scanning && !result && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lokasi Scan (Opsional)
          </label>
          <input
            type="text"
            value={scanLocation}
            onChange={(e) => setScanLocation(e.target.value)}
            placeholder="Masukkan lokasi dimana Anda melakukan scan..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      )}

      {!result && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {!scanning ? (
            <div className="text-center">
              <QrCodeIcon className="h-20 w-20 text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Siap Scan</h3>
              <p className="text-gray-600 mb-6">
                Klik tombol di bawah untuk mulai scan QR code
              </p>
              <button
                onClick={startScanning}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium mx-auto"
              >
                <CameraIcon className="h-5 w-5" />
                Mulai Scan
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '75%' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-4 border-white rounded-lg shadow-lg">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500"></div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Posisikan QR code di dalam frame
                </p>
                <button
                  onClick={stopScanning}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium mx-auto"
                >
                  <XMarkIcon className="h-5 w-5" />
                  Berhenti Scan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {result && !result.success && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-1">Scan Gagal</h3>
              <p className="text-red-700">{result.error || error || 'QR code tidak valid'}</p>
              <button
                onClick={handleReset}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      )}

      {result && result.success && result.submission && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-6">
            <CheckCircleIcon className="h-8 w-8 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold text-green-900 mb-1">QR Code Valid!</h3>
              <p className="text-green-700">Scan berhasil dicatat</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Nomor SIMLOK</dt>
              <dd className="text-lg font-semibold text-gray-900">{result.submission.simlok_number}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Vendor</dt>
              <dd className="text-gray-900">{result.submission.vendor_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Lokasi</dt>
              <dd className="text-gray-900">{result.submission.work_location}</dd>
            </div>
            {result.submission.implementation_start_date && result.submission.implementation_end_date && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Periode Valid</dt>
                <dd className="text-gray-900">
                  {new Date(result.submission.implementation_start_date).toLocaleDateString('id-ID')} -{' '}
                  {new Date(result.submission.implementation_end_date).toLocaleDateString('id-ID')}
                </dd>
              </div>
            )}
            {result.scan && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Waktu Scan</dt>
                <dd className="text-gray-900">
                  {new Date(result.scan.scanned_at).toLocaleString('id-ID')}
                </dd>
              </div>
            )}
            {scanLocation && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Lokasi Scan</dt>
                <dd className="text-gray-900">{scanLocation}</dd>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              handleReset();
              setScanLocation('');
            }}
            className="mt-4 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          >
            Scan QR Code Lain
          </button>
        </div>
      )}
    </div>
  );
}
