// Server-side validation with redirect
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import VerificationPendingClient from './VerificationPendingClient';

export default async function VerificationPendingPage() {
  // Server-side session validation - this is secure!
  const session = await getServerSession(authOptions);
  
  // If no session at all, redirect to login immediately (server-side)
  if (!session || !session.user) {
    redirect('/login?session_expired=true&reason=Sesi tidak ditemukan, silakan login kembali');
  }
  
  // If user is already verified, redirect to appropriate dashboard
  if (session.user.verified_at) {
    const role = session.user.role;
    if (role === 'VENDOR') redirect('/vendor');
    if (role === 'VERIFIER') redirect('/verifier');
    if (role === 'REVIEWER') redirect('/reviewer');
    if (role === 'APPROVER') redirect('/approver');
    if (role === 'SUPER_ADMIN') redirect('/super-admin');
    if (role === 'VISITOR') redirect('/visitor');
    redirect('/dashboard');
  }
  
  // At this point, TypeScript knows session is not null (thanks to the check above)
  // Session is valid and user is not verified - show verification pending page
  return <VerificationPendingClient session={session} />;
}
