/**
 * API Helper Functions for Standardized Responses and Error Handling
 * 
 * Provides consistent response formats, error handling, and utility functions
 * for API routes to improve maintainability and client-side error handling.
 */

import { NextResponse } from 'next/server';
import { type PaginationMeta, createPaginationMeta as createPaginationMetaHelper } from './paginationHelpers';

// Re-export for convenience
export type { PaginationMeta };
export { createPaginationMetaHelper as createPaginationMeta };

/**
 * Standard API Success Response Interface
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    timestamp?: string;
    requestId?: string;
  };
}

/**
 * Standard API Error Response Interface
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string; // Only in development
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Standard Error Codes
 */
export const ErrorCodes = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource Errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Business Logic
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  DUPLICATE_OPERATION: 'DUPLICATE_OPERATION',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

/**
 * Create a standardized success response
 * 
 * @param data - Response data
 * @param meta - Optional metadata (pagination, etc.)
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with standardized format
 */
export function successResponse<T>(
  data: T,
  meta?: Partial<ApiSuccessResponse['meta']>,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  );
}

/**
 * Create a standardized error response
 * 
 * @param code - Error code from ErrorCodes
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param details - Optional error details
 * @returns NextResponse with standardized error format
 */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: any
): NextResponse<ApiErrorResponse> {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details: isDevelopment ? details : undefined,
        stack: isDevelopment && details?.stack ? details.stack : undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Common error response builders
 */
export const CommonErrors = {
  unauthorized: (message = 'Unauthorized - Authentication required') =>
    errorResponse(ErrorCodes.AUTH_REQUIRED, message, 401),
  
  forbidden: (message = 'Forbidden - Insufficient permissions') =>
    errorResponse(ErrorCodes.FORBIDDEN, message, 403),
  
  notFound: (resource = 'Resource', message?: string) =>
    errorResponse(
      ErrorCodes.NOT_FOUND,
      message || `${resource} not found`,
      404
    ),
  
  validation: (message = 'Validation error', details?: any) =>
    errorResponse(ErrorCodes.VALIDATION_ERROR, message, 400, details),
  
  conflict: (message = 'Resource conflict', details?: any) =>
    errorResponse(ErrorCodes.CONFLICT, message, 409, details),
  
  rateLimit: (retryAfter?: number) =>
    errorResponse(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      'Too many requests. Please try again later.',
      429,
      retryAfter ? { retryAfter } : undefined
    ),
  
  internal: (message = 'Internal server error', details?: any) =>
    errorResponse(ErrorCodes.INTERNAL_ERROR, message, 500, details),
};

/**
 * Parse and validate pagination parameters from URL
 * 
 * @param searchParams - URL search parameters
 * @param defaults - Default values for page and limit
 * @returns Validated pagination parameters
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {}
): { page: number; limit: number; skip: number } {
  const {
    page: defaultPage = 1,
    limit: defaultLimit = 10,
    maxLimit = 100,
  } = defaults;
  
  const page = Math.max(1, parseInt(searchParams.get('page') || String(defaultPage), 10));
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit), 10))
  );
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Custom error classes for better error handling
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(ErrorCodes.VALIDATION_ERROR, message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(ErrorCodes.NOT_FOUND, `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(ErrorCodes.AUTH_REQUIRED, message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(ErrorCodes.FORBIDDEN, message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(ErrorCodes.CONFLICT, message, 409, details);
    this.name = 'ConflictError';
  }
}

export class BusinessRuleError extends ApiError {
  constructor(message: string, details?: any) {
    super(ErrorCodes.BUSINESS_RULE_VIOLATION, message, 400, details);
    this.name = 'BusinessRuleError';
  }
}

/**
 * Handle API errors uniformly
 * 
 * @param error - Error object
 * @returns NextResponse with standardized error format
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  // Handle custom API errors
  if (error instanceof ApiError) {
    return errorResponse(error.code, error.message, error.statusCode, error.details);
  }
  
  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any;
    
    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        return CommonErrors.conflict('Resource already exists');
      case 'P2025': // Record not found
        return CommonErrors.notFound();
      case 'P2003': // Foreign key constraint
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid reference to related resource',
          400
        );
      default:
        return CommonErrors.internal('Database operation failed');
    }
  }
  
  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
    const zodError = error as any;
    return CommonErrors.validation('Validation failed', zodError.format());
  }
  
  // Handle standard errors
  if (error instanceof Error) {
    return CommonErrors.internal(error.message, {
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
  
  // Unknown error
  return CommonErrors.internal('An unexpected error occurred');
}

/**
 * Validate required fields in request body
 * 
 * @param body - Request body object
 * @param fields - Array of required field names
 * @throws ValidationError if any required field is missing
 */
export function validateRequiredFields(body: any, fields: string[]): void {
  const missing = fields.filter(field => !(field in body) || body[field] === null || body[field] === undefined);
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Safe JSON parse with error handling
 * 
 * @param json - JSON string to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed object or default value
 */
export function safeJsonParse<T = any>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}
