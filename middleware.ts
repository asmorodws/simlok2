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

  // Get JWT token from cookie
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret' 
  });
  
  if (!token) {
    return redirectToLogin(req, 'Sesi tidak ditemukan, silakan login');
  }

  // Extract sessionToken from JWT
  const sessionToken = (token as any).sessionToken as string | undefined;
  const userId = token.sub;
  
  // No sessionToken = Old/Invalid JWT token
  if (!sessionToken) {
    if (userId) {
      await SessionService.deleteAllUserSessions(userId).catch(() => {});
    }
    return redirectToLogin(req, 'Sesi tidak valid', true);
  }
  
  // Validate session with database (single source of truth)
  const validation = await SessionService.validateSession(sessionToken);
  
  if (!validation.isValid) {
    return redirectToLogin(req, validation.reason || 'Sesi tidak valid', true);
  }

  // Special handling for /verification-pending
  if (pathname === "/verification-pending") {
    if (validation.user?.verified_at) {
      return redirectToDashboard(validation.user.role);
    }
    return NextResponse.next();
  }

  // Check role-based access for protected routes
  const matched = protectedRoutes.find((r) => pathname.startsWith(r.prefix));
  if (!matched) {
    return NextResponse.next();
  }

  const userRole = validation.user?.role;
  if (!userRole) {
    return redirectToLogin(req, 'Role tidak ditemukan', true);
  }

  // Check if user is verified (except for super admin, reviewer, and approver)
  if (userRole !== "SUPER_ADMIN" && 
      userRole !== "REVIEWER" && 
      userRole !== "APPROVER" && 
      !validation.user?.verified_at) {
    const url = req.nextUrl.clone();
    url.pathname = "/verification-pending";
    return NextResponse.redirect(url);
  }

  // Check role hierarchy
  if (roleHierarchy[userRole as Role] < roleHierarchy[matched.minRole]) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

/**
 * Helper: Redirect to login with session cleanup
 */
function redirectToLogin(
  req: NextRequest, 
  reason: string, 
  clearCookies: boolean = false
): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("session_expired", "true");
  url.searchParams.set("reason", reason);
  url.searchParams.set("callbackUrl", req.nextUrl.pathname);
  
  const response = NextResponse.redirect(url);
  
  if (clearCookies) {
    // Clear ALL NextAuth cookies
    const cookieOptions = { maxAge: 0, path: '/' };
    response.cookies.set('next-auth.session-token', '', cookieOptions);
    response.cookies.set('__Secure-next-auth.session-token', '', cookieOptions);
    response.cookies.set('next-auth.callback-url', '', cookieOptions);
    response.cookies.set('__Secure-next-auth.callback-url', '', cookieOptions);
    response.cookies.set('next-auth.csrf-token', '', cookieOptions);
    response.cookies.set('__Host-next-auth.csrf-token', '', cookieOptions);
  }
  
  return response;
}

/**
 * Helper: Redirect to role-appropriate dashboard
 */
function redirectToDashboard(role: string): NextResponse {
  const url = new URL('/', process.env.NEXTAUTH_URL || 'http://localhost:3000');
  
  switch (role) {
    case 'SUPER_ADMIN':
      url.pathname = '/super-admin';
      break;
    case 'APPROVER':
      url.pathname = '/approver';
      break;
    case 'REVIEWER':
      url.pathname = '/reviewer';
      break;
    case 'VERIFIER':
      url.pathname = '/verifier';
      break;
    case 'VISITOR':
      url.pathname = '/visitor';
      break;
    case 'VENDOR':
      url.pathname = '/vendor';
      break;
    default:
      url.pathname = '/dashboard';
  }
  
  return NextResponse.redirect(url);
}

// apply to all routes; tune matcher as needed
export const config = {
  matcher: ["/super-admin/:path*", "/approver/:path*", "/reviewer/:path*", "/verifier/:path*", "/vendor/:path*", "/dashboard/:path*", "/verification-pending"],
};
