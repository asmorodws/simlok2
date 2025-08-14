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

        // return the minimal shape Next-Auth expects
        return {
          id: user.id,
          email: user.email,
          name: user.nama_petugas,
          role: user.role,
          nama_petugas: user.nama_petugas,
        };
      },
    }),
  ],
  session: { strategy: "jwt" }, // ← built-in JWT
  callbacks: {
    async jwt({ token, user }) {
      // user only exists on first sign-in
      if (user) {
        token.role = user.role;
        token.nama_petugas = user.nama_petugas;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.sub!;
        session.user.role = token.role as import("@prisma/client").Role;
        session.user.nama_petugas = token.nama_petugas as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};