// app/lib/auth.ts
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./singletons";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { JWT_CONFIG } from "@/utils/jwt-config";
import { TokenManager } from "@/utils/token-manager";


export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      if (code === 'JWT_SESSION_ERROR') {
        console.log('JWT Session Error - clearing invalid token');
        // Don't log the full error in production
        return;
      }
      console.error('NextAuth Error:', code, metadata);
    },
    warn(code) {
      console.warn('NextAuth Warning:', code);
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null;

        // Check if user verification status is REJECTED
        if (user.verification_status === 'REJECTED') {
          throw new Error('ACCOUNT_REJECTED');
        }

        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;

        // Generate refresh token and store it
        // await prisma.refreshToken.create({
        //   data: {
        //     token: crypto.randomUUID(),
        //     userId: user.id,
        //     expiresAt: new Date(Date.now() + JWT_CONFIG.SESSION_MAX_AGE * 1000),
        //   },
        // });

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
          verification_status: user.verification_status,
          created_at: user.created_at,
        };
      },
    }),
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      try {
        // Check if token is expired
        const now = Date.now() / 1000; // Current time in seconds
      
      // user only exists on first sign-in, but we need to refresh verification status
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.officer_name = user.officer_name;
        token.vendor_name = user.vendor_name || null;
        token.verified_at = user.verified_at || null;
        token.verification_status = user.verification_status || 'PENDING';
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
            select: { verified_at: true, role: true, verification_status: true }
          });
          
          if (latestUser) {
            token.verified_at = latestUser.verified_at;
            token.verification_status = latestUser.verification_status || 'PENDING';
            console.log('JWT callback - refreshed verified_at:', latestUser.verified_at);
            console.log('JWT callback - refreshed verification_status:', latestUser.verification_status);
          }
        } catch (error) {
          console.error('Error refreshing user verification status:', error);
        }
      }
      return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        // Return empty token on error to force re-authentication
        return {};
      }
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as import("@prisma/client").User_role;
        session.user.officer_name = token.officer_name as string;
        session.user.vendor_name = token.vendor_name as string | null;
        session.user.verified_at = token.verified_at as Date | null;
        session.user.verification_status = token.verification_status as import("@prisma/client").VerificationStatus;
        session.user.created_at = token.created_at as Date;

        // Get active refresh token
        // const activeRefreshToken = await prisma.refreshToken.findFirst({
        //   where: {
        //     userId: token.id as string,
        //     expiresAt: { gt: new Date() }
        //   },
        //   orderBy: { expiresAt: 'desc' }
        // });

        // if (activeRefreshToken) {
        //   (session.user as any).refreshToken = activeRefreshToken.token;
        // }

        // Update session in database for tracking
        // await prisma.session.upsert({
        //   where: {
        //     sessionToken: activeRefreshToken?.token || 'temp-token',
        //   },
        //   create: {
        //     sessionToken: activeRefreshToken?.token || 'temp-token',
        //     userId: token.id as string,
        //     expires: new Date(Date.now() + JWT_CONFIG.SESSION_MAX_AGE * 1000),
        //   },
        //   update: {
        //     expires: new Date(Date.now() + JWT_CONFIG.SESSION_MAX_AGE * 1000),
        //   },
        // });
        
        console.log('Session callback - session.user.id:', session.user.id);
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      console.log(`User ${user.email} signed in at ${new Date()}`);
      // Clean up expired tokens on sign in
      await TokenManager.cleanupExpiredTokens();
    },
    async signOut({ token }) {
      if (token?.sub) {
        // Invalidate all refresh tokens on signout
        await TokenManager.invalidateAllUserTokens(token.sub);
      }
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