'use client';

import React, { useEffect } from 'react';
import {
  XMarkIcon,
  QrCodeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  UserIcon,
  BriefcaseIcon,
  MapPinIcon,
  CalendarDaysIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Button from '@/components/ui/button/Button';

interface ScanData {
  id: string;
  submission_id: string;
  scanned_by: string;
  scanned_at: string;
  scanner_name: string;
  scan_location?: string;
  notes?: string;
  submission: {
    id: string;
    simlok_number?: string;
    vendor_name: string;
    officer_name: string;
    job_description: string;
    work_location: string;
    approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    working_hours?: string;
    implementation?: string;
    simja_number?: string;
    sika_number?: string;
    worker_count?: number;
    implementation_start_date?: string;
    implementation_end_date?: string;
    created_at?: string;
    review_status?: 'PENDING_REVIEW' | 'MEETS_REQUIREMENTS' | 'NOT_MEETS_REQUIREMENTS';
  };
}

interface ScanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  scan: ScanData | null;
  onViewPdf?: (scan: ScanData) => void;
  showPdfButton?: boolean;
  title?: string;
  subtitle?: string;
}

export default function ScanDetailModal({
  isOpen,
  onClose,
  scan,
  onViewPdf,
  showPdfButton = true,
  title = "Detail Scan QR Code",
  subtitle
}: ScanDetailModalProps) {
  
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !scan) return null;

  // Format work location - split by comma and display in separate lines with bullet points
  const formatWorkLocation = (location: string) => {
    if (!location) return '-';
    
    // Check if location contains comma
    if (location.includes(',')) {
      const locations = location.split(',').map(loc => loc.trim()).filter(loc => loc);
      return (
        <div className="space-y-1">
          {locations.map((loc, index) => (
            <div key={index} className="flex items-start">
              <span className="mr-2 mt-1">•</span>
              <span>{loc}</span>
            </div>
          ))}
        </div>
      );
    }
    
    return location;
  };

  const getStatusBanner = () => {
    switch (scan.submission.approval_status) {
      case 'PENDING_APPROVAL':
        return (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-center">
              <ClockIcon className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="font-semibold text-yellow-800">Status: Menunggu Persetujuan</span>
            </div>
          </div>
        );
      case 'APPROVED':
        return (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-semibold text-green-800">Status: Telah Disetujui</span>
            </div>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-4 rounded-lg">
            <div className="flex items-center">
              <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
              <span className="font-semibold text-red-800">Status: Ditolak</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-none sm:rounded-2xl w-full h-full sm:max-w-4xl sm:w-full sm:max-h-[90vh] sm:h-auto overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <QrCodeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold">{title}</h3>
                <p className="text-blue-100 text-xs sm:text-sm">
                  {subtitle || scan.submission.simlok_number || 'Informasi Pengajuan'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-100px)] sm:max-h-[calc(90vh-100px)]">
          {/* Status Banner */}
          <div className="mb-6">
            {getStatusBanner()}
          </div>

          {/* Main Content Grid */}
          <div className="space-y-6">
            {/* Submission Information */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-blue-100 rounded-xl mr-4">
                  <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">Informasi Pengajuan</h4>
                  <p className="text-sm text-gray-500">Detail lengkap pengajuan SIMLOK</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <QrCodeIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Nomor SIMLOK</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {scan.submission.simlok_number || 'Belum ada nomor'}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Perusahaan</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {scan.submission.vendor_name}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Petugas PIC</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {scan.submission.officer_name}
                    </p>
                  </div>

                  {scan.submission.worker_count && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <UsersIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">Jumlah Pekerja</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {scan.submission.worker_count} orang
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <BriefcaseIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Deskripsi Pekerjaan</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {scan.submission.job_description}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPinIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Lokasi Kerja</span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {formatWorkLocation(scan.submission.work_location)}
                    </div>
                  </div>

                  {scan.submission.working_hours && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <ClockIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">Jam Kerja</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {scan.submission.working_hours}
                      </p>
                    </div>
                  )}

                  {(scan.submission.implementation_start_date || scan.submission.implementation_end_date) && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">Periode Pelaksanaan</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {scan.submission.implementation_start_date && 
                          format(new Date(scan.submission.implementation_start_date), 'dd MMM yyyy', { locale: id })}
                        {scan.submission.implementation_start_date && scan.submission.implementation_end_date && ' - '}
                        {scan.submission.implementation_end_date && 
                          format(new Date(scan.submission.implementation_end_date), 'dd MMM yyyy', { locale: id })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Document Numbers */}
              {(scan.submission.simja_number || scan.submission.sika_number) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Nomor Dokumen Pendukung</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scan.submission.simja_number && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <span className="text-xs font-medium text-blue-600">SIMJA</span>
                        <p className="text-sm font-semibold text-blue-900 mt-1">
                          {scan.submission.simja_number}
                        </p>
                      </div>
                    )}
                    {scan.submission.sika_number && (
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <span className="text-xs font-medium text-green-600">SIKA</span>
                        <p className="text-sm font-semibold text-green-900 mt-1">
                          {scan.submission.sika_number}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Scan Information */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-blue-100 rounded-xl mr-4">
                  <QrCodeIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800">Detail Scan QR Code</h4>
                  <p className="text-sm text-gray-500">Informasi verifikasi dan validasi</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Tanggal Scan</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {format(new Date(scan.scanned_at), 'dd MMMM yyyy', { locale: id })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(scan.scanned_at), "HH:mm:ss 'WIB'", { locale: id })}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPinIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Lokasi Scan</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {scan.scan_location || 'Lokasi tidak diketahui'}
                  </p>
                </div>

                {scan.scanner_name && (
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Scanner</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {scan.scanner_name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-200">
            <div>
              {showPdfButton && 
               onViewPdf && 
               scan.submission.approval_status === 'APPROVED' && 
               scan.submission.simlok_number && (
                <Button
                  onClick={() => onViewPdf(scan)}
                  variant="primary"
                  className="px-6"
                >
                  <DocumentTextIcon className="w-4 h-4 mr-2" />
                  {scan.submission?.approval_status === 'APPROVED' ? 'Lihat PDF' : 'Lihat Preview PDF'}
                </Button>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={onClose}
              className="px-6"
            >
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}