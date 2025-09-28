// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SessionValidationService } from "@/middleware/SessionValidation";

const roleHierarchy = {
  SUPER_ADMIN: 6,
  ADMIN: 5,
  APPROVER: 4,
  REVIEWER: 3,
  VERIFIER: 2,
  VENDOR: 1,
} as const;

type Role = keyof typeof roleHierarchy;

// mapping route prefix -> minimum role
const protectedRoutes: { prefix: string; minRole: Role }[] = [
  { prefix: "/super-admin", minRole: "SUPER_ADMIN" },
  { prefix: "/admin", minRole: "ADMIN" },
  { prefix: "/approver", minRole: "APPROVER" },
  { prefix: "/reviewer", minRole: "REVIEWER" },
  { prefix: "/verifier", minRole: "VERIFIER" },
  { prefix: "/vendor", minRole: "VENDOR" },
  { prefix: "/dashboard", minRole: "VENDOR" }, // contoh: semua role bisa akses /dashboard, nanti UI berbeda
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip verification check for public paths
  if (pathname === "/verification-pending" || 
      pathname === "/login" || 
      pathname === "/signup" || 
      pathname.startsWith("/api/auth") ||
      pathname === "/") {
    return NextResponse.next();
  }

  // Session validation with auto-logout
  if (!SessionValidationService.shouldExcludePath(pathname)) {
    const sessionResult = await SessionValidationService.validateSession(req);
    if (!sessionResult.isValid && sessionResult.shouldLogout) {
      console.log(`Auto-logout triggered: ${sessionResult.reason}`);
      return SessionValidationService.createLogoutResponse(req, sessionResult.reason);
    }
  }

  // check if this path is protected
  const matched = protectedRoutes.find((r) => pathname.startsWith(r.prefix));
  if (!matched) return NextResponse.next();

  // read token (jwt) from cookie (NEXTAUTH_TOKEN)
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret' 
  });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // token may have role (set in callbacks.jwt)
  const userRole = (token as any).role as string | undefined;
  const verified_at = (token as any).verified_at as string | undefined;

  console.log('Middleware - pathname:', pathname);
  console.log('Middleware - userRole:', userRole);
  console.log('Middleware - verified_at:', verified_at);

  if (!userRole) {
    // forbidden
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Check if user is verified (except for admin, super admin, reviewer, and approver)
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN" && userRole !== "REVIEWER" && userRole !== "APPROVER" && !verified_at) {
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
  matcher: ["/super-admin/:path*", "/admin/:path*", "/approver/:path*", "/reviewer/:path*", "/verifier/:path*", "/vendor/:path*", "/dashboard/:path*", "/verification-pending"],
};
