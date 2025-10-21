'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
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

/**
 * NUCLEAR OPTION: Clear ALL NextAuth cookies from browser
 * Use this when session is completely invalid/expired
 */
function clearAllAuthCookies() {
  const cookiesToClear = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url',
    'next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
  ];

  cookiesToClear.forEach(cookieName => {
    // Clear with various combinations to ensure deletion
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure`;
    document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
  
  console.log('🧹 All auth cookies cleared from browser');
}

/**
 * Force logout and clear everything
 */
async function forceLogout(reason: string) {
  console.log(`🚨 FORCE LOGOUT: ${reason}`);
  clearAllAuthCookies();
  
  // Use signOut to properly cleanup NextAuth state
  await signOut({ 
    callbackUrl: `/login?session_expired=true&reason=${encodeURIComponent(reason)}`,
    redirect: true 
  });
}

export default function VerificationPendingClient({ session: initialSession }: VerificationPendingClientProps) {
  const router = useRouter();
  const { data: clientSession, status } = useSession();
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ============================================================================
  // LAYER 1: Initial Validation (runs once on mount)
  // ============================================================================
  useEffect(() => {
    const validateSession = async () => {
      console.log('🔍 VerificationPending - Starting validation');
      console.log('📊 Status:', status);
      console.log('📦 Initial Session:', !!initialSession);
      console.log('📦 Client Session:', !!clientSession);

      // Check 1: NextAuth status - wait until authenticated or unauthenticated
      if (status === 'unauthenticated') {
        console.log('❌ User unauthenticated');
        setValidationError('Sesi tidak ditemukan');
        await forceLogout('Sesi tidak ditemukan, silakan login kembali');
        return;
      }

      // Check 2: Initial session must exist (from server component)
      if (!initialSession || !initialSession.user) {
        console.log('❌ No initial session from server');
        setValidationError('Sesi tidak valid dari server');
        await forceLogout('Sesi tidak valid, silakan login kembali');
        return;
      }

      // ⚠️ CRITICAL: Check if user is UNVERIFIED but session is VALID
      // This is the EXPECTED state for this page!
      const userIsUnverified = !initialSession.user.verified_at;
      
      if (userIsUnverified) {
        console.log('✅ User is unverified (EXPECTED STATE for this page)');
        console.log('👤 User ID:', initialSession.user.id);
        console.log('📧 Email:', initialSession.user.email);
        console.log('🏢 Vendor:', initialSession.user.vendor_name);
        
        // User is unverified - THIS IS VALID for verification-pending page!
        // Server component already validated session with getServerSession
        // Middleware already validated database session
        // NO NEED for additional validation - just allow access!
        
        console.log('✅ Unverified user with valid session - page access granted');
        setIsValidating(false);
        return; // ALLOW ACCESS - No logout, no redirect!
      }

      // If we reach here, user IS verified - they shouldn't be on this page!
      console.log('⚠️ User is already verified, redirecting to dashboard');
      const role = initialSession.user.role;
      if (role === 'VENDOR') router.push('/vendor');
      else if (role === 'VERIFIER') router.push('/verifier');
      else if (role === 'REVIEWER') router.push('/reviewer');
      else if (role === 'APPROVER') router.push('/approver');
      else if (role === 'SUPER_ADMIN') router.push('/super-admin');
      else if (role === 'VISITOR') router.push('/visitor');
      else router.push('/dashboard');
    };

    // Only run validation when status is determined
    if (status !== 'loading') {
      validateSession();
    }
  }, [status, initialSession, clientSession, router]);

  // ============================================================================
  // LAYER 2: Periodic Health Check (every 30 seconds)
  // ============================================================================
  useEffect(() => {
    if (isValidating || status === 'loading') return;

    const healthCheckInterval = setInterval(async () => {
      console.log('💓 Periodic health check');

      // Quick check: is user still authenticated?
      if (status === 'unauthenticated') {
        console.log('❌ Health check: user unauthenticated');
        await forceLogout('Sesi hilang, silakan login kembali');
        return;
      }

      // Validate with backend
      try {
        const response = await fetch('/api/session/validate', {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          console.log('❌ Health check: backend validation failed');
          await forceLogout('Validasi sesi gagal, silakan login kembali');
        } else {
          console.log('✅ Health check: session valid');
        }
      } catch (error) {
        console.error('⚠️ Health check error:', error);
        // Don't force logout on network errors
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, [isValidating, status]);

  // ============================================================================
  // LAYER 3: Real-time session monitoring
  // ============================================================================
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🔴 Session status changed to unauthenticated');
      forceLogout('Sesi berakhir, silakan login kembali');
    }
  }, [status]);

  // ============================================================================
  // RENDERING
  // ============================================================================

  // Show validation error
  if (validationError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Sesi Tidak Valid
            </h2>
            <p className="text-gray-600 mb-4">{validationError}</p>
            <p className="text-sm text-gray-500">
              Anda akan diarahkan ke halaman login...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Show loading during validation
  if (isValidating || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memvalidasi sesi...</p>
        </div>
      </div>
    );
  }

  // Get current session (prefer client session if available)
  const session = clientSession || initialSession;

  // Final guard (should never reach here if validation failed)
  if (!session || !session.user) {
    return null;
  }

  // Helper functions
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
    clearAllAuthCookies();
    await signOut({ callbackUrl: '/login' });
  };

  // ============================================================================
  // MAIN UI
  // ============================================================================
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
                      {session.user.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nama:</span>
                    <span className="font-medium text-gray-900">
                      {session.user.officer_name || session.user.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendor:</span>
                    <span className="font-medium text-gray-900">
                      {session.user.vendor_name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Role:</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {session.user.role?.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal Daftar:</span>
                    <span className="font-medium text-gray-900">
                      {session.user.created_at ? 
                        formatDate(session.user.created_at.toString()) : 
                        'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu:</span>
                    <span className="font-medium text-gray-900">
                      {session.user.created_at ? 
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
