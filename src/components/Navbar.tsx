"use client";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="flex items-center justify-between bg-slate-900 px-6 py-3 text-white">
      <Link href="/" className="text-xl font-bold">
        MyApp
      </Link>

      {session ? (
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm opacity-80">
            {session.user.name} • {session.user.role}
          </span>

          {session.user.role === "ADMIN" && (
            <Link href="/admin" className="rounded px-2 py-1 text-sm hover:bg-white/10">
              Admin
            </Link>
          )}
          {session.user.role === "VENDOR" && (
            <Link href="/vendor" className="rounded px-2 py-1 text-sm hover:bg-white/10">
              Vendor
            </Link>
          )}
          {session.user.role === "VERIFIER" && (
            <Link href="/verifier" className="rounded px-2 py-1 text-sm hover:bg-white/10">
              Verifier
            </Link>
          )}

          <button
            onClick={() => signOut()}
            className="rounded-md bg-red-600 px-3 py-1 text-sm outline-none transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Link href="/login" className="rounded px-2 py-1 text-sm hover:bg-white/10">
            Login
          </Link>
          <Link href="/register" className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20">
            Register
          </Link>
        </div>
      )}
    </nav>
  );
}