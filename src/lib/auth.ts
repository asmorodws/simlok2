// app/lib/auth.ts
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./singletons";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { JWT_CONFIG } from "@/utils/jwt-config";
import { TokenManager } from "@/utils/token-manager";
import { verifyTurnstileToken } from "@/utils/turnstile-middleware";
import { SessionService } from "@/services/session.service";


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
      credentials: { 
        email: { type: "email" }, 
        password: { type: "password" },
        turnstile_token: { type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Verify Turnstile token if provided
        if (credentials.turnstile_token && process.env.NODE_ENV === 'production') {
          // Only verify Turnstile in production
          const isTurnstileValid = await verifyTurnstileToken(credentials.turnstile_token);
          if (!isTurnstileValid) {
            throw new Error('TURNSTILE_FAILED');
          }
        } else if (process.env.NODE_ENV === 'production' && !credentials.turnstile_token) {
          // Require Turnstile in production
          throw new Error('TURNSTILE_REQUIRED');
        }
        // In development, skip Turnstile verification for easier testing

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null;

        // Check if user is active
        if (!user.isActive) {
          throw new Error('ACCOUNT_DEACTIVATED');
        }

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
    maxAge: 24 * 60 * 60, // 24 hours (1 day)
    updateAge: 2 * 60 * 60, // Update session every 2 hours if active
  },
  callbacks: {
    async jwt({ token, user }) {
      try {
        const now = Date.now() / 1000; // Current time in seconds
      
        // Initial sign-in - create new session
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
          
          // Set issued at time and expiry
          token.iat = now;
          token.exp = now + JWT_CONFIG.JWT_EXPIRE_TIME;
          
          // Create database session for tracking
          try {
            const sessionData = await SessionService.createSession(
              user.id,
              JWT_CONFIG.SESSION_MAX_AGE * 1000
            );
            token.sessionToken = sessionData.sessionToken;
            console.log('JWT callback - created database session:', sessionData.sessionToken);
          } catch (error) {
            console.error('Error creating database session:', error);
          }
          
          console.log('JWT callback - storing user.id:', user.id);
          console.log('JWT callback - token expires at:', new Date((now + JWT_CONFIG.JWT_EXPIRE_TIME) * 1000));
        } 
        // Subsequent requests - validate existing session
        else if (token.id && token.sessionToken) {
          // Check JWT expiry first
          if (token.exp && typeof token.exp === 'number') {
            if (now >= token.exp) {
              console.log('JWT callback - JWT token expired, clearing session');
              if (token.sessionToken) {
                await SessionService.deleteSession(token.sessionToken as string);
              }
              return {}; // Clear token
            }
          }
          
          // Validate database session
          const validation = await SessionService.validateSession(token.sessionToken as string);
          
          if (!validation.isValid) {
            console.log('JWT callback - database session invalid:', validation.reason);
            return {}; // Clear token
          }
          
          // Check if user still exists and is active
          if (!validation.user) {
            console.log('JWT callback - user not found in database, clearing session');
            return {};
          }
          
          if (!validation.user.isActive) {
            console.log('JWT callback - user deactivated, clearing session');
            return {};
          }
          
          // Update token with latest user data
          token.verified_at = validation.user.verified_at;
          token.verification_status = validation.user.verification_status;
          token.role = validation.user.role;
          
          console.log('JWT callback - session valid, user active');
        }
        // No valid session data
        else if (token.id && !token.sessionToken) {
          console.log('JWT callback - no session token, clearing');
          return {};
        }
        
        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        // Clean up session on error
        if (token.sessionToken) {
          try {
            await SessionService.deleteSession(token.sessionToken as string);
          } catch (e) {
            console.error('Error cleaning up session:', e);
          }
        }
        return {}; // Force re-authentication
      }
    },
    async session({ session, token }) {
      if (token && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as import("@prisma/client").User_role;
        session.user.officer_name = token.officer_name as string;
        session.user.vendor_name = token.vendor_name as string | null;
        session.user.verified_at = token.verified_at as Date | null;
        session.user.verification_status = token.verification_status as import("@prisma/client").VerificationStatus;
        session.user.created_at = token.created_at as Date;
        
        // Add session token to session for frontend access
        (session as any).sessionToken = token.sessionToken;
        
        console.log('Session callback - session.user.id:', session.user.id);
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      console.log(`User ${user.email} signed in at ${new Date()}`);
      
      // Update user's last active time
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        });
      }
      
      // Clean up expired tokens and sessions
      await TokenManager.cleanupExpiredTokens();
      await SessionService.cleanupExpiredSessions();
    },
    async signOut({ token }) {
      console.log(`User signed out at ${new Date()}`);
      
      if (token?.sub) {
        // Invalidate all refresh tokens
        await TokenManager.invalidateAllUserTokens(token.sub);
        
        // Delete all user sessions
        await SessionService.deleteAllUserSessions(token.sub);
      }
      
      // Also clean up by session token if available
      if (token?.sessionToken) {
        await SessionService.deleteSession(token.sessionToken as string);
      }
    },
    async session({ token }) {
      // Called whenever a session is checked
      if (token.exp && typeof token.exp === 'number') {
        const now = Date.now() / 1000;
        if (now >= token.exp) {
          console.log('Session expired, will be cleared');
          if (token.sessionToken) {
            await SessionService.deleteSession(token.sessionToken as string);
          }
        }
      }
    }
  },
  pages: { signIn: "/login" },
};