'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Card from '@/components/ui/card/Card';
import Button from '@/components/ui/button/Button';
import { 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  UserIcon,
  ArrowRightIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import PageLoader from '@/components/ui/loading/PageLoader';

export default function VerificationRejectedClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [countdown, setCountdown] = useState(15);
  const [autoRedirect, setAutoRedirect] = useState(true);

  // Set document title
  useEffect(() => {
    document.title = 'Verifikasi Ditolak - SIMLOK';
  }, []);

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
    if (session?.user?.verified_at) {
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

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleStopAutoRedirect = () => {
    setAutoRedirect(false);
  };

  // If user is not logged in, redirect to login
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="p-8 text-center shadow-xl">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircleIcon className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Akun Ditolak
              </h1>
              <p className="text-gray-600">
                Verifikasi akun vendor Anda telah ditolak
              </p>
            </div>

            <div className="space-y-6">
              {/* Information Box */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5 mr-3" />
                  <div className="text-left">
                    <h3 className="font-medium text-red-900 mb-2">Alasan Penolakan:</h3>
                    <p className="text-sm text-red-800">
                      Mohon hubungi administrator untuk informasi lebih lanjut mengenai penolakan akun Anda.
                    </p>
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
                  Kembali ke Login
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
                <div className="space-y-2">
                  <div className="flex items-center justify-center text-xs text-gray-600">
                    <EnvelopeIcon className="w-4 h-4 mr-2" />
                    <a href="mailto:admin@simlok.com" className="text-blue-600 hover:text-blue-700">
                      admin@simlok.com
                    </a>
                  </div>
                  <div className="flex items-center justify-center text-xs text-gray-600">
                    <PhoneIcon className="w-4 h-4 mr-2" />
                    <a href="tel:+6281234567890" className="text-blue-600 hover:text-blue-700">
                      +62 812-3456-7890
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // If user is logged in and rejected, show detailed version
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="p-8">
          {/* Icon and Status */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircleIcon className="w-10 h-10 text-red-500" />
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-semibold text-gray-900 mb-3 text-center">
              Verifikasi Ditolak
            </h1>
            
            {/* Subtitle */}
            <p className="text-gray-600 text-center mb-6">
              Maaf, akun vendor Anda tidak dapat diverifikasi oleh administrator
            </p>
          </div>

          {/* User Info Card */}
          <Card className="bg-gray-50 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-6 h-6 text-red-500" />
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
                    <span>Status:</span>
                    <span className="font-medium text-red-600">
                      Ditolak
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
                </div>
              </div>
            </div>
          </Card>

          {/* Rejection Info Alert */}
          <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-8">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-red-800 font-medium mb-1">
                Akun Tidak Dapat Diverifikasi
              </p>
              <p className="text-red-700 mb-3">
                Administrator telah meninjau data akun Anda dan memutuskan untuk tidak memverifikasi akun ini.
              </p>
              <p className="text-red-700">
                Untuk informasi lebih lanjut mengenai alasan penolakan dan kemungkinan pengajuan ulang, 
                silakan hubungi administrator melalui kontak yang tersedia di bawah.
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <Card className="bg-blue-50 p-6 mb-6">
            <h3 className="font-medium text-blue-900 mb-3 text-center">
              Hubungi Administrator
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <EnvelopeIcon className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">Email</p>
                  <a 
                    href="mailto:admin@simlok.com" 
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    admin@simlok.com
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <PhoneIcon className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">Telepon</p>
                  <a 
                    href="tel:+6281234567890" 
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    +62 812-3456-7890
                  </a>
                </div>
              </div>
            </div>
          </Card>

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
              onClick={() => window.location.href = 'mailto:admin@simlok.com?subject=Pertanyaan Mengenai Penolakan Akun Vendor&body=Halo Admin,%0A%0ASaya ingin menanyakan mengenai penolakan verifikasi akun vendor saya.%0A%0AEmail: ' + session?.user?.email + '%0ANama: ' + (session?.user?.officer_name || '') + '%0APerusahaan: ' + (session?.user?.vendor_name || '') + '%0A%0AMohon penjelasan mengenai alasan penolakan dan apakah ada kemungkinan untuk pengajuan ulang.%0A%0ATerima kasih.'}
              variant="outline"
              size="md"
              className="w-full"
            >
              <EnvelopeIcon className="w-4 h-4 mr-2" />
              Kirim Email ke Admin
            </Button>
          </div>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Untuk pengajuan akun baru, silakan hubungi administrator terlebih dahulu.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
