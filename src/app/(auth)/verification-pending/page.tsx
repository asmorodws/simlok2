// Server-side validation with redirect
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SessionService } from '@/services/session.service';
import VerificationPendingClient from './VerificationPendingClient';

export default async function VerificationPendingPage() {
  // Server-side session validation - this is secure!
  const session = await getServerSession(authOptions);
  
  // If no session at all, redirect to login immediately (server-side)
  if (!session || !session.user) {
    redirect('/login?session_expired=true&reason=Sesi tidak ditemukan, silakan login kembali');
  }
  
  // CRITICAL: Validate session against database to ensure it exists
  // This prevents access with stale JWT tokens when database session was deleted
  const sessionToken = (session as any).sessionToken as string | undefined;
  if (sessionToken) {
    const validation = await SessionService.validateSession(sessionToken);
    if (!validation.isValid) {
      console.log(`Server - Session validation FAILED for verification-pending: ${validation.reason}`);
      redirect(`/login?session_expired=true&reason=${encodeURIComponent(validation.reason || 'Sesi tidak valid, silakan login kembali')}`);
    }
    
    // CRITICAL: If user is verified but session is still valid, redirect to dashboard
    // This handles the case: verified user with valid session should NOT access verification-pending
    if (validation.user?.verified_at) {
      const role = validation.user.role;
      console.log(`Server - User already verified (from DB check), redirecting to dashboard`);
      if (role === 'VENDOR') redirect('/vendor');
      if (role === 'VERIFIER') redirect('/verifier');
      if (role === 'REVIEWER') redirect('/reviewer');
      if (role === 'APPROVER') redirect('/approver');
      if (role === 'SUPER_ADMIN') redirect('/super-admin');
      if (role === 'VISITOR') redirect('/visitor');
      redirect('/dashboard');
    }
  } else {
    // No session token in session object - invalid session
    console.log('Server - No session token found, redirecting to login');
    redirect('/login?session_expired=true&reason=Sesi tidak valid, silakan login kembali');
  }
  
  // At this point:
  // - Session exists in database (validated)
  // - User is NOT verified (checked against database)
  // - Safe to show verification pending page
  return <VerificationPendingClient session={session} />;
}
