'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/button/Button';
import { 
  ClockIcon, 
  ExclamationTriangleIcon, 
  UserIcon,
} from '@heroicons/react/24/outline';
import type { Session } from 'next-auth';

interface VerificationPendingClientProps {
  session: Session;
}

export default function VerificationPendingClient({ session }: VerificationPendingClientProps) {
  const router = useRouter();

  // FORCE SECURITY CHECK - Jangan hapus ini!
  // Paksa redirect jika session tidak valid atau data user tidak lengkap
  useEffect(() => {
    if (!session || 
        !session.user || 
        !session?.user?.email || 
        !session?.user?.name || 
        session?.user === null || 
        session?.user === undefined || 
        session?.user?.email === "") {
      // Redirect ke login jika session tidak valid
      router.push('/login');
    }
  }, [session, router]);

  // Guard clause - jangan render apapun jika session tidak valid
  if (!session || 
      !session.user || 
      !session?.user?.email || 
      !session?.user?.name || 
      session?.user === null || 
      session?.user === undefined || 
      session?.user?.email === "") {
    return null; // Jangan render apapun, tunggu redirect
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="p-8">
          {/* Icon and Status */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-warning-100 rounded-full flex items-center justify-center mb-6">
              <ClockIcon className="w-10 h-10 text-warning-500" />
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-semibold text-gray-900 mb-3 text-center">
              Menunggu Verifikasi
            </h1>
            
            {/* Subtitle */}
            <p className="text-gray-600 text-center mb-6">
              Akun Anda sedang dalam proses verifikasi oleh administrator
            </p>
          </div>

          {/* User Info Card */}
          <Card className="bg-gray-50 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-6 h-6 text-brand-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-2">
                  Informasi Akun
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="font-medium text-gray-900">
                      {session?.user?.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nama:</span>
                    <span className="font-medium text-gray-900">
                      {session?.user?.officer_name || session?.user?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendor:</span>
                    <span className="font-medium text-gray-900">
                      {session?.user?.vendor_name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Role:</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {session?.user?.role?.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal Daftar:</span>
                    <span className="font-medium text-gray-900">
                      {session?.user?.created_at ? 
                        formatDate(session.user.created_at.toString()) : 
                        'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu:</span>
                    <span className="font-medium text-gray-900">
                      {session?.user?.created_at ? 
                        formatTime(session.user.created_at.toString()) : 
                        'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Info Alert */}
          <div className="flex gap-3 p-4 bg-blue-light-50 border border-blue-light-200 rounded-xl mb-8">
            <ExclamationTriangleIcon className="w-5 h-5 text-blue-light-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-light-800 font-medium mb-1">
                Proses Verifikasi
              </p>
              <p className="text-blue-light-700">
                Administrator akan memverifikasi akun Anda dalam waktu 1-2 hari kerja. 
                Anda akan menerima notifikasi email setelah akun diverifikasi.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleLogout}
              variant="primary"
              size="md"
              className="w-full"
            >
              Keluar
            </Button>
            
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              size="md"
              className="w-full"
            >
              Refresh Status
            </Button>
          </div>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Butuh bantuan? Hubungi administrator melalui email atau sistem support.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
