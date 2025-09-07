// app/lib/auth.ts
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./singletons";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { JWT_CONFIG } from "@/utils/jwt-config";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
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
          role: user.role,
          name: user.officer_name,
          email: user.email || null,
          officer_name: user.officer_name,
          vendor_name: user.vendor_name,
          verified_at: user.verified_at,
          created_at: user.created_at,
        };
      },
    }),
  ],
  session: { 
    strategy: "jwt",
    // Session expires after configured time (default: 6 hours)
    maxAge: JWT_CONFIG.SESSION_MAX_AGE,
    // Update age extends session by this amount each time user is active
    updateAge: JWT_CONFIG.SESSION_UPDATE_AGE,
  },
  jwt: {
    // JWT expires after configured time (default: 6 hours)
    maxAge: JWT_CONFIG.JWT_EXPIRE_TIME,
  },
  callbacks: {
    async jwt({ token, user }) {
      // Check if token is expired
      const now = Date.now() / 1000; // Current time in seconds
      
      // user only exists on first sign-in, but we need to refresh verification status
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.officer_name = user.officer_name;
        token.vendor_name = user.vendor_name || null;
        token.verified_at = user.verified_at || null;
        if (user.created_at) {
          token.created_at = user.created_at;
        }
        // Set issued at time and expiry using configured values
        token.iat = now;
        token.exp = now + JWT_CONFIG.JWT_EXPIRE_TIME;
        console.log('JWT callback - storing user.id:', user.id);
        console.log('JWT callback - token expires at:', new Date((now + JWT_CONFIG.JWT_EXPIRE_TIME) * 1000));
      } else if (token.id) {
        // Check if token is expired
        if (token.exp && typeof token.exp === 'number') {
          const now = Date.now() / 1000;
          if (now >= token.exp) {
            console.log('JWT callback - token expired, clearing session');
            return {}; // Return empty object to clear token
          }
        }
        
        // Refresh user data from database to get latest verification status
        try {
          const latestUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { verified_at: true, role: true }
          });
          
          if (latestUser) {
            token.verified_at = latestUser.verified_at;
            console.log('JWT callback - refreshed verified_at:', latestUser.verified_at);
          }
        } catch (error) {
          console.error('Error refreshing user verification status:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id as string; // Use the stored user.id instead of token.sub
        session.user.role = token.role as import("@prisma/client").Role;
        session.user.officer_name = token.officer_name as string;
        session.user.vendor_name = token.vendor_name as string | null;
        session.user.verified_at = token.verified_at as Date | null;
        session.user.created_at = token.created_at as Date;
        console.log('Session callback - session.user.id:', session.user.id); // Debug log
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      console.log(`User ${user.email} signed in at ${new Date()}`);
    },
    async signOut() {
      console.log(`User signed out at ${new Date()}`);
    },
    async session({ token }) {
      // Called whenever a session is checked
      if (token.exp && typeof token.exp === 'number') {
        const now = Date.now() / 1000;
        if (now >= token.exp) {
          console.log('Session expired, will be cleared');
        }
      }
    }
  },
  pages: { signIn: "/login" },
};