/**
 * Custom Error Classes
 * Provides structured error handling with specific error types
 * Makes error handling more predictable and easier to debug
 */

import { HTTP_STATUS, ERROR_MESSAGES } from '@/config/constants';

// ==================== BASE ERROR CLASS ====================

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any> | undefined;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (context) {
      this.context = context;
    }

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

// ==================== AUTHENTICATION ERRORS ====================

/**
 * Authentication error - user not authenticated
 */
export class AuthenticationError extends AppError {
  constructor(message: string = ERROR_MESSAGES.UNAUTHORIZED, context?: Record<string, any>) {
    super(message, HTTP_STATUS.UNAUTHORIZED, true, context);
  }
}

/**
 * Authorization error - user not authorized
 */
export class AuthorizationError extends AppError {
  constructor(message: string = ERROR_MESSAGES.FORBIDDEN, context?: Record<string, any>) {
    super(message, HTTP_STATUS.FORBIDDEN, true, context);
  }
}

/**
 * Invalid credentials error
 */
export class InvalidCredentialsError extends AppError {
  constructor(message: string = ERROR_MESSAGES.INVALID_CREDENTIALS, context?: Record<string, any>) {
    super(message, HTTP_STATUS.UNAUTHORIZED, true, context);
  }
}

/**
 * Session expired error
 */
export class SessionExpiredError extends AppError {
  constructor(message: string = ERROR_MESSAGES.SESSION_EXPIRED, context?: Record<string, any>) {
    super(message, HTTP_STATUS.UNAUTHORIZED, true, context);
  }
}

// ==================== VALIDATION ERRORS ====================

/**
 * Validation error - invalid input data
 */
export class ValidationError extends AppError {
  constructor(message: string = ERROR_MESSAGES.INVALID_INPUT, context?: Record<string, any>) {
    super(message, HTTP_STATUS.BAD_REQUEST, true, context);
  }
}

/**
 * Missing required field error
 */
export class RequiredFieldError extends ValidationError {
  constructor(fieldName: string, context?: Record<string, any>) {
    super(`${fieldName}: ${ERROR_MESSAGES.REQUIRED_FIELD}`, context);
  }
}

/**
 * Invalid email format error
 */
export class InvalidEmailError extends ValidationError {
  constructor(message: string = ERROR_MESSAGES.INVALID_EMAIL, context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Invalid phone format error
 */
export class InvalidPhoneError extends ValidationError {
  constructor(message: string = ERROR_MESSAGES.INVALID_PHONE, context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Password too short error
 */
export class PasswordTooShortError extends ValidationError {
  constructor(message: string = ERROR_MESSAGES.PASSWORD_TOO_SHORT, context?: Record<string, any>) {
    super(message, context);
  }
}

// ==================== DATABASE ERRORS ====================

/**
 * Database error - general database issues
 */
export class DatabaseError extends AppError {
  constructor(message: string = ERROR_MESSAGES.DATABASE_ERROR, context?: Record<string, any>) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, true, context);
  }
}

/**
 * Not found error - resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Data', context?: Record<string, any>) {
    super(`${resource} ${ERROR_MESSAGES.NOT_FOUND.toLowerCase()}`, HTTP_STATUS.NOT_FOUND, true, context);
  }
}

/**
 * Duplicate entry error - resource already exists
 */
export class DuplicateError extends AppError {
  constructor(resource: string = 'Data', context?: Record<string, any>) {
    super(`${resource} ${ERROR_MESSAGES.DUPLICATE_ENTRY.toLowerCase()}`, HTTP_STATUS.CONFLICT, true, context);
  }
}

/**
 * Constraint violation error - database constraint failed
 */
export class ConstraintError extends DatabaseError {
  constructor(constraint: string, context?: Record<string, any>) {
    super(`Constraint violation: ${constraint}`, {
      ...context,
      constraint,
    });
  }
}

// ==================== FILE UPLOAD ERRORS ====================

/**
 * File upload error - general file upload issues
 */
export class FileUploadError extends AppError {
  constructor(message: string = ERROR_MESSAGES.UPLOAD_FAILED, context?: Record<string, any>) {
    super(message, HTTP_STATUS.BAD_REQUEST, true, context);
  }
}

/**
 * File too large error
 */
export class FileTooLargeError extends FileUploadError {
  constructor(message: string = ERROR_MESSAGES.FILE_TOO_LARGE, context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Invalid file type error
 */
export class InvalidFileTypeError extends FileUploadError {
  constructor(message: string = ERROR_MESSAGES.INVALID_FILE_TYPE, context?: Record<string, any>) {
    super(message, context);
  }
}

// ==================== RATE LIMITING ERRORS ====================

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number | undefined;

  constructor(message: string = ERROR_MESSAGES.TOO_MANY_REQUESTS, retryAfter?: number, context?: Record<string, any>) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, true, context);
    if (retryAfter !== undefined) {
      this.retryAfter = retryAfter;
    }
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.retryAfter !== undefined && { retryAfter: this.retryAfter }),
    };
  }
}

// ==================== QR CODE ERRORS ====================

/**
 * Invalid QR code error
 */
export class InvalidQRCodeError extends AppError {
  constructor(message: string = ERROR_MESSAGES.INVALID_QR, context?: Record<string, any>) {
    super(message, HTTP_STATUS.BAD_REQUEST, true, context);
  }
}

/**
 * Duplicate QR scan error
 */
export class DuplicateScanError extends AppError {
  public readonly previousScan?: any;

  constructor(message: string = ERROR_MESSAGES.DUPLICATE_SCAN, previousScan?: any, context?: Record<string, any>) {
    super(message, HTTP_STATUS.CONFLICT, true, context);
    this.previousScan = previousScan;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      previousScan: this.previousScan,
    };
  }
}

/**
 * QR code expired error
 */
export class QRExpiredError extends AppError {
  constructor(message: string = ERROR_MESSAGES.QR_EXPIRED, context?: Record<string, any>) {
    super(message, HTTP_STATUS.BAD_REQUEST, true, context);
  }
}

// ==================== NETWORK ERRORS ====================

/**
 * Network error - external service communication issues
 */
export class NetworkError extends AppError {
  constructor(message: string = ERROR_MESSAGES.NETWORK_ERROR, context?: Record<string, any>) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, true, context);
  }
}

/**
 * External service error - third-party service failed
 */
export class ExternalServiceError extends NetworkError {
  public readonly service: string;

  constructor(service: string, message?: string, context?: Record<string, any>) {
    super(message || `${service} service error`, {
      ...context,
      service,
    });
    this.service = service;
  }
}

// ==================== BUSINESS LOGIC ERRORS ====================

/**
 * Business logic error - operation not allowed
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, true, context);
  }
}

/**
 * Workflow error - invalid workflow transition
 */
export class WorkflowError extends BusinessLogicError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}

/**
 * Permission error - operation requires specific permission
 */
export class PermissionError extends AuthorizationError {
  public readonly requiredPermission: string;

  constructor(requiredPermission: string, message?: string, context?: Record<string, any>) {
    super(message || `Operasi ini memerlukan permission: ${requiredPermission}`, {
      ...context,
      requiredPermission,
    });
    this.requiredPermission = requiredPermission;
  }
}

// ==================== ERROR UTILITIES ====================

/**
 * Check if error is an operational error (safe to show to user)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Extract error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return ERROR_MESSAGES.INTERNAL_ERROR;
}

/**
 * Extract error status code safely
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  
  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
  }
  
  return new AppError(
    typeof error === 'string' ? error : ERROR_MESSAGES.INTERNAL_ERROR,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    false
  );
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown) {
  const appError = toAppError(error);
  
  return {
    error: appError.name,
    message: appError.message,
    statusCode: appError.statusCode,
    ...(process.env.NODE_ENV === 'development' && {
      stack: appError.stack,
      context: appError.context,
    }),
  };
}

// ==================== PRISMA ERROR MAPPING ====================

/**
 * Convert Prisma error to AppError
 */
export function fromPrismaError(error: any): AppError {
  // Prisma unique constraint violation
  if (error.code === 'P2002') {
    const fields = error.meta?.target?.join(', ') || 'field';
    return new DuplicateError(fields, { prismaError: error });
  }
  
  // Prisma record not found
  if (error.code === 'P2025') {
    return new NotFoundError('Record', { prismaError: error });
  }
  
  // Prisma foreign key constraint failed
  if (error.code === 'P2003') {
    return new ConstraintError('Foreign key', { prismaError: error });
  }
  
  // Prisma connection error
  if (error.code === 'P1001' || error.code === 'P1002') {
    return new DatabaseError('Database connection failed', { prismaError: error });
  }
  
  // Generic Prisma error
  return new DatabaseError(error.message, { prismaError: error });
}

// ==================== EXPORTS ====================

export default {
  AppError,
  AuthenticationError,
  AuthorizationError,
  InvalidCredentialsError,
  SessionExpiredError,
  ValidationError,
  RequiredFieldError,
  InvalidEmailError,
  InvalidPhoneError,
  PasswordTooShortError,
  DatabaseError,
  NotFoundError,
  DuplicateError,
  ConstraintError,
  FileUploadError,
  FileTooLargeError,
  InvalidFileTypeError,
  RateLimitError,
  InvalidQRCodeError,
  DuplicateScanError,
  QRExpiredError,
  NetworkError,
  ExternalServiceError,
  BusinessLogicError,
  WorkflowError,
  PermissionError,
  // Utilities
  isOperationalError,
  getErrorMessage,
  getErrorStatusCode,
  toAppError,
  formatErrorResponse,
  fromPrismaError,
};
