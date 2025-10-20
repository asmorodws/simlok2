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
      pathname.startsWith("/api/auth") ||
      pathname === "/") {
    return NextResponse.next();
  }

  // read token (jwt) from cookie for all other paths
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret' 
  });
  
  // If no token, redirect to login for ALL paths (including verification-pending)
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Validate session against database for ALL authenticated paths
  // (including /verification-pending - must validate BEFORE allowing access)
  const sessionToken = (token as any).sessionToken as string | undefined;
  const userId = token.sub;
  
  // If no session token in JWT, this is an old session - force logout
  if (!sessionToken) {
    console.log('No session token found in JWT (old session), forcing logout');
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("session_expired", "true");
    url.searchParams.set("reason", "Sesi lama terdeteksi, silakan login kembali");
    
    // Clear ALL auth cookies
    const response = NextResponse.redirect(url);
    response.cookies.set('next-auth.session-token', '', { maxAge: 0, path: '/' });
    response.cookies.set('__Secure-next-auth.session-token', '', { maxAge: 0, path: '/' });
    response.cookies.set('next-auth.callback-url', '', { maxAge: 0, path: '/' });
    response.cookies.set('__Secure-next-auth.callback-url', '', { maxAge: 0, path: '/' });
    response.cookies.set('next-auth.csrf-token', '', { maxAge: 0, path: '/' });
    response.cookies.set('__Host-next-auth.csrf-token', '', { maxAge: 0, path: '/' });
    
    // Also clean up any database sessions for this user if userId exists
    if (userId) {
      try {
        await SessionService.deleteAllUserSessions(userId);
        console.log(`Cleaned up all sessions for user: ${userId}`);
      } catch (error) {
        console.error('Error cleaning up user sessions:', error);
      }
    }
    
    return response;
  }
  
  // Validate session against database
  const validation = await SessionService.validateSession(sessionToken);
  
  if (!validation.isValid) {
    console.log(`Session validation failed: ${validation.reason}`);
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("session_expired", "true");
    url.searchParams.set("reason", validation.reason || "Sesi tidak valid");
    
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

  // Session is valid, now check if this is /verification-pending
  // Allow access to verification-pending page with valid session (even if not verified)
  if (pathname === "/verification-pending") {
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
