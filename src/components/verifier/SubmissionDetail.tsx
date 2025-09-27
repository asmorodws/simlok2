'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  QrCodeIcon,
  PrinterIcon,
  ArrowLeftIcon,
  UserIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CalendarIcon,
  DocumentTextIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/hooks/useToast';
import { Button } from '../ui';
import Image from 'next/image';
import * as QRCode from 'qrcode';

interface Worker {
  id: string;
  worker_name: string;
  worker_photo?: string | null;
}

interface SubmissionData {
  id: string;
  vendor_name: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation: string | null;
  approval_status: string; // Changed from union type to string
  simlok_number?: string | null;
  simlok_date?: Date | string | null;
  created_at: Date | string;
  qrcode?: string | null;
  other_notes?: string | null;
  rejection_reason?: string | null;
  worker_list?: Worker[];
}

interface SubmissionDetailProps {
  submission: SubmissionData;
}

export default function SubmissionDetail({ submission }: SubmissionDetailProps) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Generate QR Code when needed
  const generateQRCode = async () => {
    if (submission.qrcode && !qrCodeDataUrl) {
      try {
        const dataUrl = await QRCode.toDataURL(submission.qrcode, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataUrl(dataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
  };

  // Generate QR code when component mounts if QR code exists
  useEffect(() => {
    if (submission.qrcode) {
      generateQRCode();
    }
  }, [submission.qrcode]);

  const handleApprove = async () => {
    if (!confirm('Apakah Anda yakin ingin menyetujui SIMLOK ini?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval_status: 'APPROVED'
        }),
      });

      if (response.ok) {
        showSuccess('Berhasil', 'SIMLOK telah disetujui');
        window.location.reload();
      } else {
        const error = await response.json();
        showError('Error', error.message || 'Gagal menyetujui SIMLOK');
      }
    } catch (error) {
      console.error('Error approving submission:', error);
      showError('Error', 'Gagal menyetujui SIMLOK');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Masukkan alasan penolakan:');
    if (!reason || !reason.trim()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approval_status: 'REJECTED',
          rejection_reason: reason.trim()
        }),
      });

      if (response.ok) {
        showSuccess('Berhasil', 'SIMLOK telah ditolak');
        window.location.reload();
      } else {
        const error = await response.json();
        showError('Error', error.message || 'Gagal menolak SIMLOK');
      }
    } catch (error) {
      console.error('Error rejecting submission:', error);
      showError('Error', 'Gagal menolak SIMLOK');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-4 h-4 mr-2" />
            Disetujui
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-4 h-4 mr-2" />
            Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-4 h-4 mr-2" />
            Menunggu Verifikasi
          </span>
        );
    }
  };

  const formatDate = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            size="sm"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {submission.simlok_number || `SIMLOK ${submission.id.slice(-8)}`}
            </h1>
            <p className="text-gray-600">
              Dibuat: {formatDate(submission.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {getStatusBadge(submission.approval_status)}
          
          {submission.approval_status === 'APPROVED' && submission.qrcode && (
            <Button
              onClick={() => setShowQRCode(true)}
              variant="outline"
            >
              <QrCodeIcon className="w-4 h-4 mr-2" />
              QR Code
            </Button>
          )}
          
          <Button
            onClick={() => window.print()}
            variant="outline"
          >
            <PrinterIcon className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Informasi Umum
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <BuildingOfficeIcon className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Nama Vendor
                  </p>
                  <p className="text-sm text-gray-900">
                    {submission.vendor_name}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <UserIcon className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Petugas
                  </p>
                  <p className="text-sm text-gray-900">
                    {submission.officer_name}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <MapPinIcon className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Lokasi Kerja
                  </p>
                  <p className="text-sm text-gray-900">
                    {submission.work_location}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CalendarIcon className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Pelaksanaan
                  </p>
                  <p className="text-sm text-gray-900">
                    {submission.implementation || 'Tidak ditentukan'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Deskripsi Pekerjaan
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {submission.job_description}
            </p>
          </div>

          {/* Workers List */}
          {submission.worker_list && submission.worker_list.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                Daftar Pekerja ({submission.worker_list.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submission.worker_list.map((worker) => (
                  <div key={worker.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                    {worker.worker_photo ? (
                      <Image
                        src={worker.worker_photo}
                        alt={worker.worker_name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <PhotoIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {worker.worker_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}          {/* Rejection Reason */}
          {submission.approval_status === 'REJECTED' && submission.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-red-800 mb-2">
                Alasan Penolakan
              </h2>
              <p className="text-sm text-red-700">
                {submission.rejection_reason}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {submission.approval_status === 'PENDING' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Aksi Verifikasi
              </h3>
              
              <div className="space-y-3">
                <Button
                  onClick={handleApprove}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    'Memproses...'
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                      Setujui SIMLOK
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleReject}
                  disabled={loading}
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircleIcon className="w-4 h-4 mr-2" />
                  Tolak SIMLOK
                </Button>
              </div>
            </div>
          )}

          {/* Status History */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Riwayat Status
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Submission Dibuat
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(submission.created_at)}
                  </p>
                </div>
              </div>
              
              {submission.approval_status !== 'PENDING' && (
                <div className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    submission.approval_status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {submission.approval_status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(submission.created_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SIMLOK Info */}
          {submission.approval_status === 'APPROVED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-green-800 mb-4">
                Informasi SIMLOK
              </h3>
              
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-green-700">
                    Nomor SIMLOK
                  </p>
                  <p className="text-sm text-green-600">
                    {submission.simlok_number || 'Sedang diproses'}
                  </p>
                </div>
                
                {submission.simlok_date && (
                  <div>
                    <p className="text-sm font-medium text-green-700">
                      Tanggal SIMLOK
                    </p>
                    <p className="text-sm text-green-600">
                      {new Date(submission.simlok_date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                )}

                {/* QR Code untuk Print */}
                {submission.qrcode && qrCodeDataUrl && (
                  <div className="hidden print:block mt-6">
                    <p className="text-sm font-medium text-green-700 mb-2">
                      QR Code SIMLOK
                    </p>
                    <Image
                      src={qrCodeDataUrl}
                      alt="QR Code SIMLOK"
                      width={120}
                      height={120}
                      className="border border-gray-300 rounded"
                    />
                    <p className="text-xs text-green-600 mt-1 break-all">
                      {submission.simlok_number}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRCode && submission.qrcode && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowQRCode(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="text-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    QR Code SIMLOK
                  </h3>
                  
                  <div className="bg-white p-4 rounded-lg inline-block">
                    {qrCodeDataUrl ? (
                      <Image
                        src={qrCodeDataUrl}
                        alt="QR Code SIMLOK"
                        width={200}
                        height={200}
                        className="mx-auto"
                      />
                    ) : submission.qrcode ? (
                      <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-sm text-gray-600">Generating QR...</span>
                      </div>
                    ) : (
                      <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded text-gray-500">
                        <QrCodeIcon className="h-16 w-16" />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2 break-all">
                    {submission.qrcode}
                  </p>
                  
                  <p className="mt-4 text-sm text-gray-500">
                    {submission.simlok_number}
                  </p>
                  
                  <div className="mt-6">
                    <Button
                      onClick={() => setShowQRCode(false)}
                      variant="outline"
                      className="w-full"
                    >
                      Tutup
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}