'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/button/Button';
import Card from '@/components/ui/Card';
import { UserData } from '@/types';
import { useToast } from '@/hooks/useToast';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  ShieldCheckIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';

interface ReviewerUserVerificationModalProps {
  user: UserData | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate?: (updatedUser: UserData) => void;
}

export default function ReviewerUserVerificationModal({
  user,
  isOpen,
  onClose,
  onUserUpdate
}: ReviewerUserVerificationModalProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<'approve' | 'reject' | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(user);
  const { showSuccess, showError } = useToast();

  // Update local user state when prop changes
  React.useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  if (!isOpen || !currentUser) return null;

  const formatDate = (dateInput: string | Date | number | null | undefined) => {
    if (dateInput === null || dateInput === undefined) return 'N/A';

    try {
      let date: Date;

      if (dateInput instanceof Date) {
        date = dateInput;
      } else if (typeof dateInput === 'number') {
        // timestamp (ms)
        date = new Date(dateInput);
      } else if (typeof dateInput === 'string') {
        // try parsing string (ISO or other)
        date = new Date(dateInput);
        if (isNaN(date.getTime())) {
          // try Date.parse fallback
          const parsed = Date.parse(dateInput);
          if (!isNaN(parsed)) date = new Date(parsed);
        }
      } else {
        // fallback to toString and attempt parse
        const s = String(dateInput);
        date = new Date(s);
      }

      if (!date || isNaN(date.getTime())) return 'N/A';

      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const handleVerifyUser = async (action: 'approve' | 'reject') => {
    if (!currentUser) return;
    
    setProcessing(currentUser.id);
    
    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'approve' ? 'VERIFY' : 'REJECT'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user verification');
      }

      const result = await response.json();
      
      if (action === 'approve' && result.user) {
        // Update local state immediately
        setCurrentUser(result.user);
        onUserUpdate?.(result.user);
        showSuccess('Berhasil', 'User berhasil diverifikasi');
      } else if (action === 'reject' && result.user) {
        // Update local state for rejection
        setCurrentUser(result.user);
        onUserUpdate?.(result.user);
        showSuccess('Berhasil', 'User berhasil ditolak');
      }

      setShowConfirmModal(null);
      
    } catch (error) {
      console.error('Error updating user verification:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to update user verification');
    } finally {
      setProcessing(null);
    }
  };

  const handleModalClose = () => {
    setShowConfirmModal(null);
    onClose();
  };

  const isVerified = currentUser.verification_status === 'VERIFIED';
  const isRejected = currentUser.verification_status === 'REJECTED';
  const isPending = currentUser.verification_status === 'PENDING' || !currentUser.verification_status;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
        <div className="w-full h-full sm:max-w-4xl sm:w-full sm:h-auto sm:max-h-[90vh] overflow-hidden">
          <Card className="shadow-2xl rounded-none sm:rounded-lg h-full sm:h-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-100 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                  <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                    Detail User
                  </h2>
                  <p className="text-sm text-gray-500">
                    Informasi lengkap dan status verifikasi
                  </p>
                </div>
              </div>
              <Button
                onClick={handleModalClose}
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 max-h-[calc(100vh-200px)] sm:max-h-[calc(90vh-200px)] overflow-y-auto">
              <div className="space-y-8">
                {/* Status Section */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                      isVerified 
                        ? 'bg-green-100 text-green-800' 
                        : isRejected
                        ? 'bg-red-100 text-red-800'
                        : 'bg-warning-100 text-warning-800'
                    }`}>
                      {isVerified ? (
                        <CheckCircleIcon className="w-4 h-4" />
                      ) : isRejected ? (
                        <XCircleIcon className="w-4 h-4" />
                      ) : (
                        <ClockIcon className="w-4 h-4" />
                      )}
                      {isVerified ? 'Terverifikasi' : isRejected ? 'Ditolak' : 'Menunggu Verifikasi'}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      currentUser.role === 'VENDOR' 
                        ? 'bg-blue-100 text-blue-800' 
                        : currentUser.role === 'VERIFIER'
                        ? 'bg-purple-100 text-purple-800'
                        : currentUser.role === 'VISITOR'
                        ? 'bg-cyan-100 text-cyan-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <IdentificationIcon className="w-4 h-4 inline mr-1" />
                      {currentUser.role}
                    </div>
                  </div>
                </div>

                {/* User Info Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Personal Information */}
                  <Card className="bg-gray-50">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                        <UserIcon className="w-5 h-5 mr-2 text-gray-500" />
                        Informasi Personal
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                            <UserIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500">Nama Petugas</p>
                            <p className="text-base font-medium text-gray-900 break-words">
                              {currentUser.officer_name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                            <EnvelopeIcon className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500">Email</p>
                            <p className="text-base font-medium text-gray-900 break-words">
                              {currentUser.email}
                            </p>
                          </div>
                        </div>

                        {currentUser.phone_number && (
                          <div className="flex items-start">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                              <PhoneIcon className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-500">No. Telepon</p>
                              <p className="text-base font-medium text-gray-900">
                                {currentUser.phone_number}
                              </p>
                            </div>
                          </div>
                        )}

                        {currentUser.address && (
                          <div className="flex items-start">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                              <MapPinIcon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-500">Alamat</p>
                              <p className="text-base font-medium text-gray-900 break-words">
                                {currentUser.address}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* System Information */}
                  <Card className="bg-gray-50">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                        <ShieldCheckIcon className="w-5 h-5 mr-2 text-gray-500" />
                        Informasi Sistem
                      </h3>

                      <div className="space-y-4">
                        {currentUser.vendor_name && (
                          <div className="flex items-start">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                              <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-500">Nama Vendor</p>
                              <p className="text-base font-medium text-gray-900 break-words">
                                {currentUser.vendor_name}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                            <ClockIcon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500">Tanggal Daftar</p>
                            <p className="text-base font-medium text-gray-900">
                              {formatDate(currentUser.created_at)}
                            </p>
                          </div>
                        </div>

                        {isVerified && currentUser.verified_at && (
                          <div className="flex items-start">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                              <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-500">Diverifikasi Pada</p>
                              <p className="text-base font-medium text-gray-900">
                                {formatDate(currentUser.verified_at)}
                              </p>
                              {currentUser.verified_by && (
                                <p className="text-sm text-gray-600 mt-1">
                                  
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {isRejected && currentUser.rejected_at && (
                          <div className="flex items-start">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                              <XCircleIcon className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-500">Ditolak Pada</p>
                              <p className="text-base font-medium text-gray-900">
                                {formatDate(currentUser.rejected_at)}
                              </p>
                              
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Actions for Pending Users */}
                {isPending && (
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CheckCircleIcon className="w-5 h-5 mr-2 text-blue-600" />
                        Tindakan Verifikasi
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Pilih tindakan yang sesuai untuk user ini. Persetujuan akan memberikan akses sistem, 
                        sedangkan penolakan akan mengubah status user menjadi ditolak.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                          onClick={() => setShowConfirmModal('approve')}
                          disabled={processing === currentUser.id}
                          variant="primary"
                          size="md"
                          className="flex-1"
                        >
                          <CheckCircleIcon className="w-5 h-5 mr-2" />
                          Setujui User
                        </Button>
                        <Button
                          onClick={() => setShowConfirmModal('reject')}
                          disabled={processing === currentUser.id}
                          variant="destructive"
                          size="md"
                          className="flex-1"
                        >
                          <XCircleIcon className="w-5 h-5 mr-2" />
                          Tolak User
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Verification Status Info */}
                {isVerified && (
                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="p-6">
                      <div className="flex items-start">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                          <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-green-900 mb-2">
                            User Sudah Terverifikasi
                          </h4>
                          <p className="text-green-700">
                            User ini sudah dapat mengakses sistem sesuai dengan role yang diberikan dan 
                            memiliki akses penuh ke fitur yang tersedia.
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Rejection Status Info */}
                {isRejected && (
                  <Card className="bg-gradient-to-r from-red-50 to-pink-50">
                    <div className="p-6">
                      <div className="flex items-start">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                          <XCircleIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-red-900 mb-2">
                            User Telah Ditolak
                          </h4>
                          <p className="text-red-700">
                            User ini telah ditolak dan tidak dapat mengakses sistem. User tidak dapat login dan 
                            perlu menghubungi administrator untuk informasi lebih lanjut.
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <Button onClick={handleModalClose} variant="outline" size="md">
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && currentUser && (
        <ConfirmationModal
          isOpen={!!showConfirmModal}
          onClose={() => setShowConfirmModal(null)}
          user={currentUser}
          action={showConfirmModal}
          isProcessing={processing === currentUser.id}
          onConfirm={() => handleVerifyUser(showConfirmModal)}
        />
      )}
    </>
  );
}

// Modal Konfirmasi
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData;
  action: 'approve' | 'reject';
  isProcessing: boolean;
  onConfirm: () => void;
}

function ConfirmationModal({ isOpen, onClose, user, action, isProcessing, onConfirm }: ConfirmationModalProps) {
  if (!isOpen) return null;

  const isApprove = action === 'approve';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <Card className="max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isApprove ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {isApprove ? (
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              ) : (
                <XCircleIcon className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Konfirmasi {isApprove ? 'Persetujuan' : 'Penolakan'}
              </h3>
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            Apakah Anda yakin ingin {isApprove ? 'menyetujui' : 'menolak'} user{' '}
            <strong className="text-gray-900">{user.officer_name}</strong>?
          </p>

          {!isApprove && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-red-800 mb-1">Peringatan!</p>
                  <p className="text-red-700">
                    Status user akan diubah menjadi ditolak dan tidak dapat login lagi.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isProcessing}
              variant={isApprove ? "primary" : "destructive"}
              size="sm"
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Memproses...
                </span>
              ) : (
                `Ya, ${isApprove ? 'Setujui' : 'Tolak'}`
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}