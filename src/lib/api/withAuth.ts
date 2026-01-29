import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { ApiErrors } from './response';

export type RouteHandler = (
  request: NextRequest,
  session: Session,
  params?: any
) => Promise<NextResponse>;

export interface AuthMiddlewareOptions {
  allowedRoles?: string[];
  requireAuth?: boolean;
}

/**
 * Higher-order function to wrap API route handlers with authentication
 * Eliminates duplicate auth checks across routes
 * 
 * @param handler - The route handler function
 * @param options - Authentication options (allowed roles, etc.)
 * 
 * @example
 * export const GET = withAuth(async (request, session) => {
 *   // session is guaranteed to exist here
 *   return apiSuccess({ data: 'protected data' });
 * }, { allowedRoles: ['ADMIN'] });
 */
export function withAuth(
  handler: RouteHandler,
  options: AuthMiddlewareOptions = {}
) {
  const { allowedRoles, requireAuth = true } = options;

  return async (request: NextRequest, context?: { params: any }) => {
    try {
      // Get session
      const session = await getServerSession(authOptions);

      // Check if auth is required
      if (requireAuth && !session?.user) {
        return ApiErrors.unauthorized();
      }

      // Check role permissions
      if (allowedRoles && allowedRoles.length > 0) {
        if (!session?.user) {
          return ApiErrors.unauthorized();
        }

        const userRole = session.user.role;
        if (!allowedRoles.includes(userRole)) {
          return ApiErrors.forbidden();
        }
      }

      // Call the actual handler with session guaranteed to exist
      return await handler(request, session!, context?.params);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return ApiErrors.internal('Authentication error');
    }
  };
}

/**
 * Pre-configured auth middleware for common role combinations
 */
export const AuthPresets = {
  /**
   * Only SUPER_ADMIN can access
   */
  superAdminOnly: (handler: RouteHandler) =>
    withAuth(handler, { allowedRoles: ['SUPER_ADMIN'] }),

  /**
   * SUPER_ADMIN and ADMIN can access
   */
  adminOnly: (handler: RouteHandler) =>
    withAuth(handler, { allowedRoles: ['SUPER_ADMIN', 'ADMIN'] }),

  /**
   * REVIEWER and above can access
   */
  reviewerOrAbove: (handler: RouteHandler) =>
    withAuth(handler, { allowedRoles: ['SUPER_ADMIN', 'REVIEWER'] }),

  /**
   * APPROVER and above can access
   */
  approverOrAbove: (handler: RouteHandler) =>
    withAuth(handler, { allowedRoles: ['SUPER_ADMIN', 'APPROVER'] }),

  /**
   * VENDOR only
   */
  vendorOnly: (handler: RouteHandler) =>
    withAuth(handler, { allowedRoles: ['VENDOR'] }),

  /**
   * VERIFIER only
   */
  verifierOnly: (handler: RouteHandler) =>
    withAuth(handler, { allowedRoles: ['VERIFIER'] }),

  /**
   * Any authenticated user
   */
  authenticated: (handler: RouteHandler) =>
    withAuth(handler, { requireAuth: true }),
};
