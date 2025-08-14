// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const roleHierarchy = {
  ADMIN: 3,
  VERIFIER: 2,
  VENDOR: 1,
} as const;

type Role = keyof typeof roleHierarchy;

// mapping route prefix -> minimum role
const protectedRoutes: { prefix: string; minRole: Role }[] = [
  { prefix: "/admin", minRole: "ADMIN" },
  { prefix: "/verifier", minRole: "VERIFIER" },
  { prefix: "/vendor", minRole: "VENDOR" },
  { prefix: "/dashboard", minRole: "VENDOR" }, // contoh: semua role bisa akses /dashboard, nanti UI berbeda
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // check if this path is protected
  const matched = protectedRoutes.find((r) => pathname.startsWith(r.prefix));
  if (!matched) return NextResponse.next();

  // read token (jwt) from cookie (NEXTAUTH_TOKEN)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/auth/signin";
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // token may have role (set in callbacks.jwt)
  const userRole = (token as any).role as string | undefined;
  if (!userRole) {
    // forbidden
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (roleHierarchy[userRole as Role] < roleHierarchy[matched.minRole]) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}

// apply to all routes; tune matcher as needed
export const config = {
  matcher: ["/admin/:path*", "/verifier/:path*", "/vendor/:path*", "/dashboard/:path*"],
};
