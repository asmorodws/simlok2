'use client';

import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';

interface UnverifiedUser {
  id: string;
  nama_petugas: string;
  email: string;
  role: string;
  nama_vendor?: string;
  date_created_at: string;
}

interface UnverifiedUsersAlertProps {
  onViewPendingUsers?: () => void;
}

export default function UnverifiedUsersAlert({ onViewPendingUsers }: UnverifiedUsersAlertProps) {
  const [unverifiedCount, setUnverifiedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnverifiedCount();
  }, []);

  const fetchUnverifiedCount = async () => {
    try {
      const response = await fetch('/api/users?verificationStatus=pending&limit=1');
      if (response.ok) {
        const data = await response.json();
        setUnverifiedCount(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching unverified users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || unverifiedCount === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-yellow-800 mb-1">
                User Menunggu Verifikasi
              </h3>
              <p className="text-yellow-700">
                Ada <strong>{unverifiedCount}</strong> user yang menunggu persetujuan verifikasi dari admin.
              </p>
            </div>
            <button
              onClick={onViewPendingUsers}
              className="ml-4 inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition duration-200"
            >
              <UserIcon className="w-4 h-4 mr-2" />
              Lihat User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
