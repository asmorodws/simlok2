'use client';

import { useState } from 'react';
import { UserData } from '@/types/user';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/button/Button';
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

interface UserVerificationModalProps {
  user: UserData | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate?: (updatedUser: UserData) => void;
  onUserRemove?: (userId: string) => void;
}

export default function UserVerificationModal({
  user,
  isOpen,
  onClose,
  onUserUpdate,
  onUserRemove
}: UserVerificationModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<'approve' | 'reject' | null>(null);

  if (!isOpen || !user) return null;

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isVerified = !!user.verified_at;

  const handleVerifyUser = async (action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/users/${user.id}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (action === 'approve' && result.user) {
          onUserUpdate?.(result.user);
        } else if (action === 'reject') {
          onUserRemove?.(user.id);
        }
        
        setShowConfirmModal(null);
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} user`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(`Terjadi kesalahan saat ${action === 'approve' ? 'menyetujui' : 'menolak'} user`);
    } finally {
      setIsProcessing(false);
    }
  };

  const ConfirmModal = () => {
    if (!showConfirmModal) return null;

    const isApprove = showConfirmModal === 'approve';

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
        <Card className="max-w-md w-full mx-4">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isApprove ? 'bg-green-100 dark:bg-green-500/20' : 'bg-red-100 dark:bg-red-500/20'
              }`}>
                {isApprove ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Konfirmasi {isApprove ? 'Persetujuan' : 'Penolakan'}
                </h3>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Apakah Anda yakin ingin {isApprove ? 'menyetujui' : 'menolak'} user{' '}
              <strong className="text-gray-900 dark:text-white">{user.officer_name}</strong>?
            </p>

            {!isApprove && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-red-800 dark:text-red-300 mb-1">Peringatan!</p>
                    <p className="text-red-700 dark:text-red-400">
                      User akan dihapus dari sistem dan tidak dapat login lagi.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => setShowConfirmModal(null)}
                variant="outline"
                size="sm"
                disabled={isProcessing}
              >
                Batal
              </Button>
              <Button
                onClick={() => handleVerifyUser(showConfirmModal)}
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
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
          <Card className="shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-brand-100 dark:bg-brand-500/20 rounded-full flex items-center justify-center mr-4">
                  <UserIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Detail User
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Informasi lengkap dan status verifikasi
                  </p>
                </div>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              <div className="space-y-8">
                {/* Status Section */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                      isVerified 
                        ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400' 
                        : 'bg-warning-100 text-warning-800 dark:bg-warning-500/20 dark:text-warning-400'
                    }`}>
                      {isVerified ? (
                        <CheckCircleIcon className="w-4 h-4" />
                      ) : (
                        <ClockIcon className="w-4 h-4" />
                      )}
                      {isVerified ? 'Terverifikasi' : 'Menunggu Verifikasi'}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      user.role === 'VENDOR' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400' 
                        : user.role === 'VERIFIER'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400'
                    }`}>
                      <IdentificationIcon className="w-4 h-4 inline mr-1" />
                      {user.role}
                    </div>
                  </div>
                </div>

                {/* User Info Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Personal Information */}
                  <Card className="bg-gray-50 dark:bg-gray-800/50">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <UserIcon className="w-5 h-5 mr-2 text-gray-500" />
                        Informasi Personal
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                            <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nama Petugas</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white break-words">
                              {user.officer_name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                            <EnvelopeIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white break-words">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        {user.phone_number && (
                          <div className="flex items-start">
                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                              <PhoneIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No. Telepon</p>
                              <p className="text-base font-medium text-gray-900 dark:text-white">
                                {user.phone_number}
                              </p>
                            </div>
                          </div>
                        )}

                        {user.address && (
                          <div className="flex items-start">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                              <MapPinIcon className="w-5 h-5 text-blue-600 dark:text-purple-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Alamat</p>
                              <p className="text-base font-medium text-gray-900 dark:text-white break-words">
                                {user.address}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* System Information */}
                  <Card className="bg-gray-50 dark:bg-gray-800/50">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <ShieldCheckIcon className="w-5 h-5 mr-2 text-gray-500" />
                        Informasi Sistem
                      </h3>

                      <div className="space-y-4">
                        {user.vendor_name && (
                          <div className="flex items-start">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                              <BuildingOfficeIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nama Vendor</p>
                              <p className="text-base font-medium text-gray-900 dark:text-white break-words">
                                {user.vendor_name}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-500/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                            <ClockIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tanggal Daftar</p>
                            <p className="text-base font-medium text-gray-900 dark:text-white">
                              {formatDate(user.created_at)}
                            </p>
                          </div>
                        </div>

                        {isVerified && user.verified_at && (
                          <div className="flex items-start">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                              <ShieldCheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Diverifikasi Pada</p>
                              <p className="text-base font-medium text-gray-900 dark:text-white">
                                {formatDate(user.verified_at)}
                              </p>
                              {user.verified_by && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  oleh: {user.verified_by}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Actions for Unverified Users */}
                {!isVerified && (
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/5 dark:to-indigo-500/5">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <CheckCircleIcon className="w-5 h-5 mr-2 text-blue-600" />
                        Tindakan Verifikasi
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Pilih tindakan yang sesuai untuk user ini. Persetujuan akan memberikan akses sistem, 
                        sedangkan penolakan akan menghapus user dari sistem.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                          onClick={() => setShowConfirmModal('approve')}
                          disabled={isProcessing}
                          variant="primary"
                          size="md"
                          className="flex-1"
                        >
                          <CheckCircleIcon className="w-5 h-5 mr-2" />
                          Setujui User
                        </Button>
                        <Button
                          onClick={() => setShowConfirmModal('reject')}
                          disabled={isProcessing}
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
                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/5 dark:to-emerald-500/5">
                    <div className="p-6">
                      <div className="flex items-start">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                          <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                            User Sudah Terverifikasi
                          </h4>
                          <p className="text-green-700 dark:text-green-300">
                            User ini sudah dapat mengakses sistem sesuai dengan role yang diberikan dan 
                            memiliki akses penuh ke fitur yang tersedia.
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
              <Button onClick={onClose} variant="outline" size="md">
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal />
    </>
  );
}
