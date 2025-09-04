'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UnverifiedUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect jika user sudah terverifikasi
    if (session?.user?.verified_at) {
      router.push('/dashboard');
    }
    // Redirect jika tidak ada session (belum login)
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'numeric',
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-gray-300 rounded-lg p-8 text-center shadow-lg">
          {/* Title */}
          <h1 className="text-lg font-medium text-gray-800 mb-6">
            Akun anda sedang dalam proses verifikasi
          </h1>

          {/* Registration Info */}
          <div className="mb-8">
            <p className="text-sm text-gray-700 mb-2">Akun anda di daftarkan pada</p>
            <div className="text-sm font-medium text-gray-800">
              <div>tanggal {session?.user?.created_at ? formatDate(session.user.created_at.toString()) : '6-6-2006'}</div>
              <div>jam {session?.user?.created_at ? formatTime(session.user.created_at.toString()) : '16:06'}</div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleLogout}
            className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition duration-200"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}