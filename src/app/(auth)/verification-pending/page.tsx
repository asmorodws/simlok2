'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/button/Button';
import { 
  ClockIcon, 
  ExclamationTriangleIcon, 
  UserIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import PageLoader from '@/components/ui/PageLoader';

export default function VerificationPendingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [countdown, setCountdown] = useState(15);
  const [autoRedirect, setAutoRedirect] = useState(true);

  // Auto redirect to login after 15 seconds if not logged in
  useEffect(() => {
    if (status === 'unauthenticated' && autoRedirect && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'unauthenticated' && autoRedirect && countdown === 0) {
      router.push("/login");
    }
    return undefined;
  }, [countdown, autoRedirect, router, status]);

  useEffect(() => {
    // Redirect jika user sudah terverifikasi
    if (session?.user?.verified_at && session?.user) {
      const role = session.user.role;
      if (role === "VENDOR") {
        router.push("/vendor");
      } else if (role === "VERIFIER") {
        router.push("/verifier");
      } else if (role === "REVIEWER") {
        router.push("/reviewer");
      } else if (role === "APPROVER") {
        router.push("/approver");
      } else if (role === "SUPER_ADMIN") {
        router.push("/super-admin");
      } else if (role === "VISITOR") {
        router.push("/visitor");
      } else {
        router.push('/dashboard');
      }
    }
  }, [session, router]);

  if (status === 'loading') {
    return <PageLoader message="Memeriksa status verifikasi..." />;
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

  const handleStopAutoRedirect = () => {
    setAutoRedirect(false);
  };

  // If user is not logged in (just registered), show simplified version
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="p-8 text-center shadow-xl">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <ClockIcon className="w-8 h-8 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Pendaftaran Berhasil!
              </h1>
              <p className="text-gray-600">
                Akun vendor Anda telah berhasil dibuat
              </p>
            </div>

            <div className="space-y-6">
              {/* Status Steps */}
              <div className="space-y-4">
                <div className="flex items-center text-left bg-green-50 p-4 rounded-lg">
                  <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0 mr-3" />
                  <div>
                    <p className="font-medium text-green-800">Pendaftaran Selesai</p>
                    <p className="text-sm text-green-600">Data vendor telah tersimpan</p>
                  </div>
                </div>

                <div className="flex items-center text-left bg-orange-50 p-4 rounded-lg">
                  <ClockIcon className="w-6 h-6 text-orange-500 flex-shrink-0 mr-3" />
                  <div>
                    <p className="font-medium text-orange-800">Menunggu Verifikasi</p>
                    <p className="text-sm text-orange-600">Admin sedang meninjau akun Anda</p>
                  </div>
                </div>

                <div className="flex items-center text-left bg-gray-50 p-4 rounded-lg">
                  <ShieldCheckIcon className="w-6 h-6 text-gray-400 flex-shrink-0 mr-3" />
                  <div>
                    <p className="font-medium text-gray-500">Akun Aktif</p>
                    <p className="text-sm text-gray-400">Setelah verifikasi selesai</p>
                  </div>
                </div>
              </div>

              {/* Information Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5 mr-3" />
                  <div className="text-left">
                    <h3 className="font-medium text-blue-900 mb-2">Langkah Selanjutnya:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Admin akan meninjau data pendaftaran Anda</li>
                      <li>• Proses verifikasi membutuhkan waktu 1-2 hari kerja</li>
                      <li>• Anda akan menerima notifikasi setelah akun diverifikasi</li>
                      <li>• Setelah diverifikasi, Anda dapat mengakses dashboard vendor</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={() => router.push("/login")}
                  className="w-full" 
                  size="md"
                >
                  <ArrowRightIcon className="w-4 h-4 mr-2" />
                  Lanjut ke Halaman Login
                </Button>
                
                {autoRedirect && (
                  <button
                    onClick={handleStopAutoRedirect}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Auto redirect dalam {countdown} detik
                    <br />
                    <span className="underline">Klik untuk membatalkan</span>
                  </button>
                )}
              </div>

              {/* Contact Information */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">
                  Butuh bantuan?
                </p>
                <p className="text-xs text-gray-600">
                  Hubungi admin di{" "}
                  <a href="mailto:admin@simlok.com" className="text-blue-600 hover:text-blue-700">
                    admin@simlok.com
                  </a>
                  <br />
                  atau telepon{" "}
                  <a href="tel:+6281234567890" className="text-blue-600 hover:text-blue-700">
                    +62 812-3456-7890
                  </a>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // If user is logged in but not verified, show detailed version
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
