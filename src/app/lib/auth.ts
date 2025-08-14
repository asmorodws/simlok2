// app/lib/auth.ts
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;

        console.log('Auth authorize - returning user:', { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        }); // Debug log

        // return the minimal shape Next-Auth expects
        return {
          id: user.id,
          email: user.email,
          name: user.nama_petugas,
          role: user.role,
          nama_petugas: user.nama_petugas,
          nama_vendor: user.nama_vendor,
        };
      },
    }),
  ],
  session: { strategy: "jwt" }, // ← built-in JWT
  callbacks: {
    async jwt({ token, user }) {
      // user only exists on first sign-in
      if (user) {
        token.id = user.id; // Store the actual user.id from database
        token.role = user.role;
        token.nama_petugas = user.nama_petugas;
        token.nama_vendor = user.nama_vendor;
        console.log('JWT callback - storing user.id:', user.id); // Debug log
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id as string; // Use the stored user.id instead of token.sub
        session.user.role = token.role as import("@prisma/client").Role;
        session.user.nama_petugas = token.nama_petugas as string;
        session.user.nama_vendor = token.nama_vendor as string | null;
        console.log('Session callback - session.user.id:', session.user.id); // Debug log
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};