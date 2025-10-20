// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SessionService } from "@/services/session.service";

const roleHierarchy = {
  SUPER_ADMIN: 6,
  APPROVER: 4,
  REVIEWER: 3,
  VERIFIER: 2,
  VISITOR: 1,
  VENDOR: 1,
} as const;

type Role = keyof typeof roleHierarchy;

// mapping route prefix -> minimum role
const protectedRoutes: { prefix: string; minRole: Role }[] = [
  { prefix: "/super-admin", minRole: "SUPER_ADMIN" },
  { prefix: "/approver", minRole: "APPROVER" },
  { prefix: "/reviewer", minRole: "REVIEWER" },
  { prefix: "/verifier", minRole: "VERIFIER" },
  { prefix: "/visitor", minRole: "VISITOR" },
  { prefix: "/vendor", minRole: "VENDOR" },
  { prefix: "/dashboard", minRole: "VENDOR" }, // contoh: semua role bisa akses /dashboard, nanti UI berbeda
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip all checks for public paths (no authentication needed)
  if (pathname === "/login" || 
      pathname === "/signup" || 
      pathname === "/verification-rejected" ||
      pathname.startsWith("/api/auth") ||
      pathname === "/") {
    return NextResponse.next();
  }

  // Read token (jwt) from cookie for all other paths
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret' 
  });
  
  // If no token, redirect to login for ALL paths (including verification-pending)
  if (!token) {
    console.log('Middleware - No token found, redirecting to login');
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("session_expired", "true");
    url.searchParams.set("reason", "Sesi tidak ditemukan, silakan login kembali");
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    
    // Clear ALL auth cookies
    const response = NextResponse.redirect(url);
    response.cookies.set('next-auth.session-token', '', { maxAge: 0, path: '/' });
    response.cookies.set('__Secure-next-auth.session-token', '', { maxAge: 0, path: '/' });
    return response;
  }

  // Validate session against database for ALL authenticated paths
  // This is CRITICAL - even /verification-pending must have a VALID database session
  const sessionToken = (token as any).sessionToken as string | undefined;
  const userId = token.sub;
  
  // If no session token in JWT, this is an old/invalid session - force logout
  if (!sessionToken) {
    console.log('Middleware - No session token in JWT (old/invalid session), forcing logout');
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("session_expired", "true");
    url.searchParams.set("reason", "Sesi tidak valid, silakan login kembali");
    
    // Clear ALL auth cookies
    const response = NextResponse.redirect(url);
    response.cookies.set('next-auth.session-token', '', { maxAge: 0, path: '/' });
    response.cookies.set('__Secure-next-auth.session-token', '', { maxAge: 0, path: '/' });
    response.cookies.set('next-auth.callback-url', '', { maxAge: 0, path: '/' });
    response.cookies.set('__Secure-next-auth.callback-url', '', { maxAge: 0, path: '/' });
    response.cookies.set('next-auth.csrf-token', '', { maxAge: 0, path: '/' });
    response.cookies.set('__Host-next-auth.csrf-token', '', { maxAge: 0, path: '/' });
    
    // Clean up any database sessions for this user if userId exists
    if (userId) {
      try {
        await SessionService.deleteAllUserSessions(userId);
        console.log(`Middleware - Cleaned up all sessions for user: ${userId}`);
      } catch (error) {
        console.error('Middleware - Error cleaning up user sessions:', error);
      }
    }
    
    return response;
  }
  
  // CRITICAL: Validate session against database - this prevents access with expired/deleted sessions
  console.log(`Middleware - Validating database session: ${sessionToken.substring(0, 10)}...`);
  const validation = await SessionService.validateSession(sessionToken);
  
  if (!validation.isValid) {
    console.log(`Middleware - Session validation FAILED: ${validation.reason}`);
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("session_expired", "true");
    url.searchParams.set("reason", validation.reason || "Sesi tidak valid atau sudah kadaluarsa");
    
    // Clear ALL auth cookies
    const response = NextResponse.redirect(url);
    response.cookies.set('next-auth.session-token', '', { maxAge: 0, path: '/' });
    response.cookies.set('__Secure-next-auth.session-token', '', { maxAge: 0, path: '/' });
    response.cookies.set('next-auth.callback-url', '', { maxAge: 0, path: '/' });
    response.cookies.set('__Secure-next-auth.callback-url', '', { maxAge: 0, path: '/' });
    response.cookies.set('next-auth.csrf-token', '', { maxAge: 0, path: '/' });
    response.cookies.set('__Host-next-auth.csrf-token', '', { maxAge: 0, path: '/' });
    return response;
  }

  console.log(`Middleware - Session validation SUCCESS for user: ${validation.user?.email}`);

  // Session is valid! Now check the specific path
  // /verification-pending: Allow access with valid session (even if not verified)
  if (pathname === "/verification-pending") {
    // Additional check: user must NOT be verified to access this page
    const verified_at = (token as any).verified_at as string | undefined;
    if (verified_at) {
      console.log('Middleware - User already verified, redirecting from verification-pending');
      // User is already verified, redirect to dashboard
      const userRole = (token as any).role as string | undefined;
      const url = req.nextUrl.clone();
      if (userRole === 'VENDOR') url.pathname = '/vendor';
      else if (userRole === 'VERIFIER') url.pathname = '/verifier';
      else if (userRole === 'REVIEWER') url.pathname = '/reviewer';
      else if (userRole === 'APPROVER') url.pathname = '/approver';
      else if (userRole === 'SUPER_ADMIN') url.pathname = '/super-admin';
      else if (userRole === 'VISITOR') url.pathname = '/visitor';
      else url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    // User has valid session but not verified - allow access to verification-pending
    console.log('Middleware - Allowing access to verification-pending (valid session, not verified)');
    return NextResponse.next();
  }

  // For other protected routes, continue with role and verification checks
  const matched = protectedRoutes.find((r) => pathname.startsWith(r.prefix));
  if (!matched) return NextResponse.next();

  // token may have role (set in callbacks.jwt)
  const userRole = (token as any).role as string | undefined;
  const verified_at = (token as any).verified_at as string | undefined;

  console.log('Middleware - pathname:', pathname);
  console.log('Middleware - userRole:', userRole);
  console.log('Middleware - verified_at:', verified_at);

  if (!userRole) {
    // No role means invalid session - redirect to login, NOT verification-pending
    console.log('Middleware - No user role found, redirecting to login');
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("session_expired", "true");
    url.searchParams.set("reason", "Sesi tidak valid, silakan login kembali");
    return NextResponse.redirect(url);
  }

  // Check if user is verified (except for super admin, reviewer, and approver)
  // Only redirect to verification-pending if user has valid session but not verified
  if (userRole !== "SUPER_ADMIN" && userRole !== "REVIEWER" && userRole !== "APPROVER" && !verified_at) {
    console.log('Middleware - User not verified, redirecting to verification-pending');
    const url = req.nextUrl.clone();
    url.pathname = "/verification-pending";
    return NextResponse.redirect(url);
  }

  if (roleHierarchy[userRole as Role] < roleHierarchy[matched.minRole]) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

// apply to all routes; tune matcher as needed
export const config = {
  matcher: ["/super-admin/:path*", "/approver/:path*", "/reviewer/:path*", "/verifier/:path*", "/vendor/:path*", "/dashboard/:path*", "/verification-pending"],
};
