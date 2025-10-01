// src/lib/notificationAudience.ts
import { NextRequest } from "next/server";

type Scope = "admin" | "vendor" | "reviewer" | "approver";

export type AudienceContext =
  | { scope: Scope; readerKey: "vendor"; readerId: string }   // pakai NotificationRead.vendor_id
  | { scope: Scope; readerKey: "user"; readerId: string };    // pakai NotificationRead.user_id

/**
 * Tentukan scope dan pembaca (user/vendor) berdasarkan role & query.
 * - SUPER_ADMIN -> scope: 'admin' (readerKey: 'user')
 * - REVIEWER    -> scope: 'reviewer' (readerKey: 'user')
 * - APPROVER    -> scope: 'approver' (readerKey: 'user')
 * - VENDOR      -> scope: 'vendor' (readerKey: 'vendor')
 *
 * Catatan: untuk scope 'vendor', jika kamu menyimpan ID vendor berbeda dengan user.id,
 * kamu bisa kirimkan ?vendorId=xxx di query; fallback: session.user.id.
 */
export function resolveAudience(req: NextRequest, role: string, userId: string): AudienceContext {
  const params = new URL(req.url).searchParams;
  let scopeParam = (params.get("scope") || "").toLowerCase() as Scope | "";
  if (!scopeParam) {
    scopeParam =
      role === "SUPER_ADMIN" ? "admin" :
      role === "REVIEWER"    ? "reviewer" :
      role === "APPROVER"    ? "approver" :
      "vendor";
  }

  if (scopeParam === "vendor") {
    const vendorId = params.get("vendorId") || userId; // sesuaikan kalau ID vendor ≠ userId
    return { scope: "vendor", readerKey: "vendor", readerId: vendorId };
  }
  return { scope: scopeParam as Exclude<Scope, "vendor">, readerKey: "user", readerId: userId };
}
