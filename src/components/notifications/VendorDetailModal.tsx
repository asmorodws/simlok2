'use client';

import { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon, 
  BuildingOfficeIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface VendorData {
  id: string;
  officer_name: string;
  email: string;
  vendor_name: string | null;
  address: string | null;
  phone_number: string | null;
  role: string;
  created_at: string;
  verified_at: string | null;
}

interface VendorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
}

export default function VendorDetailModal({
  isOpen,
  onClose,
  vendorId
}: VendorDetailModalProps) {
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchVendorDetails = async () => {
    if (!vendorId) {
      console.log('❌ No vendorId provided to fetchVendorDetails');
      return;
    }

    console.log('🔍 Fetching vendor details for ID:', vendorId);

    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch(`/api/admin/users/${vendorId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch vendor details');
      }
      
      const data = await response.json();
      console.log('✅ Vendor data fetched:', data);
      setVendor(data.user);
    } catch (err) {
      console.error('❌ Error fetching vendor details:', err);
      setError('Gagal memuat detail vendor');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 VendorDetailModal - isOpen:', isOpen, 'vendorId:', vendorId);
    if (isOpen && vendorId) {
      fetchVendorDetails();
    }
  }, [isOpen, vendorId]);

  const handleVerifyVendor = async () => {
    if (!vendor) return;

    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/admin/users/${vendor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verified_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify vendor');
      }

      // Update local state
      setVendor(prev => prev ? { ...prev, verified_at: new Date().toISOString() } : null);
    } catch (err) {
      console.error('Error verifying vendor:', err);
      setError('Gagal memverifikasi vendor');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    console.log('🚫 VendorDetailModal - NOT OPEN');
    return null;
  }

  console.log('✅ VendorDetailModal - RENDERING');

  const isVerified = vendor?.verified_at !== null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
          <Card className="shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mr-4">
                  <UserIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Detail Vendor Baru
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Informasi lengkap pendaftaran vendor
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {isLoading && !vendor ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                  <span className="ml-2 text-gray-600">Memuat detail vendor...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600">{error}</p>
                  <Button
                    onClick={fetchVendorDetails}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Coba Lagi
                  </Button>
                </div>
              ) : vendor ? (
                <div className="space-y-6">
                  {/* Status Section */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                        isVerified 
                          ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400'
                      }`}>
                        {isVerified ? (
                          <CheckCircleIcon className="w-4 h-4" />
                        ) : (
                          <ClockIcon className="w-4 h-4" />
                        )}
                        {isVerified ? 'Terverifikasi' : 'Menunggu Verifikasi'}
                      </div>
                      <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400">
                        <IdentificationIcon className="w-4 h-4 inline mr-1" />
                        {vendor.role}
                      </div>
                    </div>
                    {!isVerified && (
                      <Button
                        onClick={handleVerifyVendor}
                        disabled={isLoading}
                        variant="default"
                        size="sm"
                      >
                        {isLoading ? 'Memverifikasi...' : 'Verifikasi Vendor'}
                      </Button>
                    )}
                  </div>

                  {/* Vendor Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                {vendor.officer_name}
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
                                {vendor.email}
                              </p>
                            </div>
                          </div>

                          {vendor.phone_number && (
                            <div className="flex items-start">
                              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                                <PhoneIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No. Telepon</p>
                                <p className="text-base font-medium text-gray-900 dark:text-white">
                                  {vendor.phone_number}
                                </p>
                              </div>
                            </div>
                          )}

                          {vendor.address && (
                            <div className="flex items-start">
                              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                                <MapPinIcon className="w-5 h-5 text-blue-600 dark:text-purple-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Alamat</p>
                                <p className="text-base font-medium text-gray-900 dark:text-white break-words">
                                  {vendor.address}
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
                          <BuildingOfficeIcon className="w-5 h-5 mr-2 text-gray-500" />
                          Informasi Sistem
                        </h3>

                        <div className="space-y-4">
                          {vendor.vendor_name && (
                            <div className="flex items-start">
                              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                                <BuildingOfficeIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nama Vendor</p>
                                <p className="text-base font-medium text-gray-900 dark:text-white break-words">
                                  {vendor.vendor_name}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-start">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-500/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                              <CalendarIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tanggal Daftar</p>
                              <p className="text-base font-medium text-gray-900 dark:text-white">
                                {new Date(vendor.created_at).toLocaleDateString('id-ID', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>

                          {vendor.verified_at && (
                            <div className="flex items-start">
                              <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tanggal Verifikasi</p>
                                <p className="text-base font-medium text-gray-900 dark:text-white">
                                  {new Date(vendor.verified_at).toLocaleDateString('id-ID', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={onClose}
                variant="outline"
                size="default"
              >
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
