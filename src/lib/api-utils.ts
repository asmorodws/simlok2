/**
 * Common utilities for API route handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ZodError, ZodSchema } from 'zod';
import type { ApiError, ApiSuccess } from '@/shared/dto';

/**
 * Standard API response helpers
 */
export function apiError(
  message: string, 
  status: number = 400, 
  code?: string
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: 'API Error',
      message,
      ...(code && { code }),
    },
    { status }
  );
}

export function apiSuccess<T = any>(
  data?: T, 
  message?: string,
  status: number = 200
): NextResponse<ApiSuccess> {
  return NextResponse.json(
    {
      success: true,
      ...(data !== undefined && { data }),
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Validate request body with Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error?: never } | { data?: never; error: string }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
      return { error: `Validation failed: ${messages.join(', ')}` };
    }
    return { error: 'Invalid JSON body' };
  }
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { data: T; error?: never } | { data?: never; error: string } {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());
    const data = schema.parse(params);
    return { data };
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
      return { error: `Validation failed: ${messages.join(', ')}` };
    }
    return { error: 'Invalid query parameters' };
  }
}

/**
 * Get authenticated session with role checking
 */
export async function getAuthenticatedSession(
  allowedRoles?: string[]
): Promise<
  | { session: any; error?: never }
  | { session?: never; error: NextResponse }
> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return { error: apiError('Authentication required', 401) };
    }

    if (allowedRoles && !allowedRoles.includes(session.user.role)) {
      return { error: apiError('Insufficient permissions', 403) };
    }

    return { session };
  } catch (error) {
    console.error('Auth error:', error);
    return { error: apiError('Authentication failed', 401) };
  }
}

/**
 * Safe async route handler wrapper
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API route error:', error);
      
      if (error instanceof Error) {
        return apiError(error.message, 500);
      }
      
      return apiError('Internal server error', 500);
    }
  };
}

/**
 * CORS headers for API routes
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXTAUTH_URL || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

/**
 * Handle OPTIONS requests for CORS
 */
export function handleOptions(): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}
