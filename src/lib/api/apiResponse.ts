/**
 * Standardized API Response Utilities
 * 
 * Provides consistent response formatting across all API routes
 * 
 * Features:
 * - Consistent JSON response structure
 * - Type-safe error responses
 * - Standardized HTTP status codes
 * - Built-in logging for errors
 * - Cache header support
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger';

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    cached?: boolean;
    timestamp?: string;
    [key: string]: any;
  };
}

/**
 * Standard error codes and their HTTP status mappings
 */
export const ErrorCodes = {
  UNAUTHORIZED: { status: 401, message: 'Unauthorized' },
  FORBIDDEN: { status: 403, message: 'Forbidden' },
  NOT_FOUND: { status: 404, message: 'Not Found' },
  BAD_REQUEST: { status: 400, message: 'Bad Request' },
  CONFLICT: { status: 409, message: 'Conflict' },
  VALIDATION_ERROR: { status: 422, message: 'Validation Error' },
  INTERNAL_ERROR: { status: 500, message: 'Internal Server Error' },
  SERVICE_UNAVAILABLE: { status: 503, message: 'Service Unavailable' },
  TOO_MANY_REQUESTS: { status: 429, message: 'Too Many Requests' },
} as const;

/**
 * Success response with data
 */
export function successResponse<T>(
  data: T,
  options?: {
    message?: string;
    cached?: boolean;
    meta?: Record<string, any>;
    headers?: HeadersInit;
  }
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (options?.message) {
    response.message = options.message;
  }

  if (options?.cached !== undefined || options?.meta) {
    response.meta = {
      ...options?.meta,
      ...(options?.cached !== undefined && { cached: options.cached }),
      timestamp: new Date().toISOString(),
    };
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  // Add cache header if cached
  if (options?.cached) {
    (headers as Record<string, string>)['X-Cache'] = 'HIT';
  } else if (options?.cached === false) {
    (headers as Record<string, string>)['X-Cache'] = 'MISS';
  }

  return NextResponse.json(response, { headers });
}

/**
 * Error response with standard formatting
 */
export function errorResponse(
  error: keyof typeof ErrorCodes | string,
  options?: {
    details?: string;
    data?: any;
    logContext?: string;
    logError?: Error | unknown;
    headers?: HeadersInit;
  }
): NextResponse<ApiResponse> {
  // Get error config or use custom
  const errorConfig = typeof error === 'string' && error in ErrorCodes
    ? ErrorCodes[error as keyof typeof ErrorCodes]
    : { status: 500, message: error };

  const response: ApiResponse = {
    success: false,
    error: errorConfig.message,
  };

  if (options?.details) {
    response.message = options.details;
  }

  if (options?.data) {
    response.data = options.data;
  }

  // Log error if context provided
  if (options?.logContext && options?.logError) {
    const errorMessage = options.logError instanceof Error ? options.logError.message : String(options.logError);
    const errorStack = options.logError instanceof Error ? options.logError.stack : undefined;
    logger.error(options.logContext, errorMessage, {
      stack: errorStack,
      details: options.details,
    });
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  return NextResponse.json(response, { 
    status: errorConfig.status,
    headers 
  });
}

/**
 * Unauthorized response (401)
 */
export function unauthorizedResponse(message?: string): NextResponse<ApiResponse> {
  return errorResponse('UNAUTHORIZED', message ? {
    details: message,
  } : {
    details: 'Authentication required',
  });
}

/**
 * Forbidden response (403)
 */
export function forbiddenResponse(message?: string): NextResponse<ApiResponse> {
  return errorResponse('FORBIDDEN', message ? {
    details: message,
  } : {
    details: 'Insufficient permissions',
  });
}

/**
 * Not found response (404)
 */
export function notFoundResponse(resource?: string): NextResponse<ApiResponse> {
  return errorResponse('NOT_FOUND', resource ? {
    details: `${resource} not found`,
  } : {});
}

/**
 * Bad request response (400)
 */
export function badRequestResponse(message?: string, data?: any): NextResponse<ApiResponse> {
  const options: any = {};
  if (message !== undefined) options.details = message;
  if (data !== undefined) options.data = data;
  return errorResponse('BAD_REQUEST', options);
}

/**
 * Validation error response (422)
 */
export function validationErrorResponse(errors: any): NextResponse<ApiResponse> {
  return errorResponse('VALIDATION_ERROR', {
    details: 'Validation failed',
    data: errors,
  });
}

/**
 * Internal server error response (500)
 */
export function internalErrorResponse(
  context: string,
  error: Error | unknown,
  includeDetails = false
): NextResponse<ApiResponse> {
  const options: any = {
    logContext: context,
    logError: error,
  };
  if (includeDetails && error instanceof Error) {
    options.details = error.message;
  }
  return errorResponse('INTERNAL_ERROR', options);
}

/**
 * Conflict response (409)
 */
export function conflictResponse(message: string, data?: any): NextResponse<ApiResponse> {
  return errorResponse('CONFLICT', {
    details: message,
    data,
  });
}

/**
 * Wrap async API handler with standardized error handling
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>,
  context: string
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      return internalErrorResponse(context, error);
    }
  };
}

/**
 * Type guard for checking if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Type guard for checking if response is an error
 */
export function isErrorResponse(
  response: ApiResponse
): response is ApiResponse & { success: false; error: string } {
  return response.success === false && response.error !== undefined;
}
