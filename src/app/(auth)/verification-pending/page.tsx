// Server-side validation with redirect
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import VerificationPendingClient from './VerificationPendingClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Menunggu Verifikasi - SIMLOK',
  description: 'Akun Anda sedang dalam proses verifikasi oleh admin',
};

export default async function VerificationPendingPage() {
  // OPTIMIZED: Trust middleware validation
  // Middleware already validated session against database
  // No need to re-validate here - just check session data
  const session = await getServerSession(authOptions);
  
  // Middleware should have caught this, but double-check for safety
  if (!session || !session.user) {
    redirect('/login?session_expired=true&reason=Sesi tidak ditemukan, silakan login kembali');
  }
  
  // Check if user is verified (business logic check, not security)
  // Middleware already validated session is legitimate
  if (session.user.verified_at) {
    const role = session.user.role;
    // User already verified, redirect to appropriate dashboard
    if (role === 'VENDOR') redirect('/vendor');
    if (role === 'VERIFIER') redirect('/verifier');
    if (role === 'REVIEWER') redirect('/reviewer');
    if (role === 'APPROVER') redirect('/approver');
    if (role === 'SUPER_ADMIN') redirect('/super-admin');
    if (role === 'VISITOR') redirect('/visitor');
    redirect('/dashboard');
  }
  
  // User is unverified - show verification pending page
  // Session is valid (middleware checked), user is unverified (we checked)
  return <VerificationPendingClient session={session} />;
}
