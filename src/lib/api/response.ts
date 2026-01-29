import { NextResponse } from 'next/server';

/**
 * Standardized API response utilities
 * Ensures consistent response format across all API routes
 */

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a successful API response
 * @param data - The data to return
 * @param status - HTTP status code (default: 200)
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Create an error API response
 * @param error - Error message
 * @param status - HTTP status code (default: 400)
 */
export function apiError(error: string, status: number = 400): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: () => apiError('Unauthorized', 401),
  forbidden: () => apiError('Forbidden', 403),
  notFound: (resource: string = 'Resource') => apiError(`${resource} not found`, 404),
  badRequest: (message: string = 'Bad request') => apiError(message, 400),
  internal: (message: string = 'Internal server error') => apiError(message, 500),
  conflict: (message: string = 'Conflict') => apiError(message, 409),
  unprocessable: (message: string = 'Unprocessable entity') => apiError(message, 422),
};

/**
 * Rate limit headers utility
 */
export function withRateLimitHeaders(
  response: NextResponse,
  headers: Record<string, string>
): NextResponse {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
