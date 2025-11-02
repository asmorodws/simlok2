// app/lib/auth.ts
import Credentials from "next-auth/providers/credentials";
import { prisma } from "../database";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
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
        turnstile_token: { type: "text" },
        skip_turnstile: { type: "text" } // For auto-login after registration
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Skip Turnstile validation if this is auto-login after registration
        const skipTurnstile = credentials.skip_turnstile === 'true';
        
        // Verify Turnstile token if provided and not skipped
        if (!skipTurnstile && credentials.turnstile_token && process.env.NODE_ENV === 'production') {
          const isTurnstileValid = await verifyTurnstileToken(credentials.turnstile_token);
          if (!isTurnstileValid) {
            throw new Error('TURNSTILE_FAILED');
          }
        } else if (!skipTurnstile && process.env.NODE_ENV === 'production' && !credentials.turnstile_token) {
          // Require Turnstile in production (unless skipped for auto-login)
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
        // Initial sign-in - create session
        if (user) {
          const sessionData = await SessionService.createSession(
            user.id,
            24 * 60 * 60 * 1000 // 24 hours
          );
          
          token.sub = user.id;
          token.sessionToken = sessionData.sessionToken;
          return token;
        }
        
        // Subsequent requests - validate session
        if (token.sub && token.sessionToken) {
          const validation = await SessionService.validateSession(token.sessionToken as string);
          
          if (!validation.isValid) {
            throw new Error('SESSION_INVALID');
          }
          
          return token;
        }
        
        // No session data
        throw new Error('NO_SESSION_TOKEN');
        
      } catch (error) {
        // Clean up on error
        if (token.sessionToken) {
          await SessionService.deleteSession(token.sessionToken as string).catch(() => {});
        }
        return null as any;
      }
    },
    
    async session({ session, token }) {
      try {
        if (!token || !token.sub || !token.sessionToken) {
          return null as any;
        }

        const validation = await SessionService.validateSession(token.sessionToken as string);
        
        if (!validation.isValid || !validation.user) {
          return null as any;
        }

        // Populate session with fresh data from database
        session.user.id = validation.user.id;
        session.user.email = validation.user.email;
        session.user.role = validation.user.role;
        session.user.officer_name = validation.user.officer_name;
        session.user.vendor_name = validation.user.vendor_name;
        session.user.verified_at = validation.user.verified_at;
        session.user.verification_status = validation.user.verification_status;
        session.user.created_at = validation.user.created_at;
        
        // IMPORTANT: Add sessionToken to session object for server-side validation
        (session as any).sessionToken = token.sessionToken;
        
        return session;
      } catch (error) {
        return null as any;
      }
    },
  },
  events: {
    async signIn() {
      // SessionService.createSession() already updated lastActiveAt + sessionExpiry
      // No need to update again here - would cause duplicate UPDATE query
      
      // Only do cleanup tasks (run in background)
      SessionService.cleanupExpiredSessions().catch(() => {});
      TokenManager.cleanupExpiredTokens().catch(() => {});
    },
    
    async signOut({ token }) {
      try {
        if (token?.sub) {
          await SessionService.deleteAllUserSessions(token.sub);
          await TokenManager.invalidateAllUserTokens(token.sub);
        }
        
        if (token?.sessionToken) {
          await SessionService.deleteSession(token.sessionToken as string);
        }
      } catch (error) {
        console.error('Signout error:', error);
      }
    },
  },
  pages: { signIn: "/login" },
};