'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface VerificationGuardProps {
  children: React.ReactNode;
}

export default function VerificationGuard({ children }: VerificationGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/login');
      return;
    }

    // Check if user is verified (admin always allowed)
    if (session.user.role !== 'ADMIN' && !session.user.verified_at) {
      console.log('VerificationGuard - User not verified, redirecting...');
      router.push('/verification-pending');
      return;
    }
  }, [session, status, router]);

  // Show loading while checking
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  // Don't render if not verified (except admin)
  if (session.user.role !== 'ADMIN' && !session.user.verified_at) {
    return null;
  }

  return <>{children}</>;
}
